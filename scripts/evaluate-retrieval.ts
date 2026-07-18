/**
 * Real, run-it-yourself retrieval evaluation: indexes a small hand-written
 * corpus into a throwaway session, then measures Recall@1, Recall@3, and MRR
 * for semantic-only search vs. the full hybrid (semantic + BM25, RRF-fused)
 * pipeline — calling the exact retriever.ts code the live app uses, not a
 * reimplementation. TOP_K matches ask.ts's real, configured topK of 3.
 *
 * Mirrors the evaluator from the original Python tutorial (see the
 * hybrid-rag-pipeline skill's evaluator.py). Run with `npm run evaluate`.
 * Needs DATABASE_URL and OPENAI_API_KEY (.env.local covers local dev).
 */
import { buildChunks } from "@/lib/rag/chunker";
import { ensureSchema, sql } from "@/lib/rag/db";
import { embed, embedBatch, toVectorLiteral } from "@/lib/rag/embeddings";
import { hybridRetrieve, semanticSearch } from "@/lib/rag/retriever";

const SESSION_ID = "eval-session";
const TOP_K = 3; // matches ask.ts's real hybridRetrieve(sessionId, question, 3)

interface EvalDoc {
  docId: string;
  text: string;
}

// Eight short documents: four distinct concepts (should be easy for either
// method), plus two "decoy pairs" that share a topic and tone but differ on
// one rare token (an error code, a plan name) — the classic case for why
// keyword search still earns its place next to embeddings.
const CORPUS: EvalDoc[] = [
  {
    docId: "doc_pgvector",
    text: "pgvector is a Postgres extension that adds a native vector data type and distance operators for nearest-neighbor search directly inside the database. It supports several distance functions, including cosine distance, L2 (Euclidean) distance, and inner product, exposed as SQL operators so a similarity search is just an ORDER BY clause. For larger datasets, pgvector offers approximate-nearest-neighbor indexes such as IVFFlat and HNSW, trading a small amount of recall for a large speedup over an exact brute-force scan. Because the vectors live in the same database as the rest of the application data, a semantic search query can be combined with ordinary SQL filtering in a single query.",
  },
  {
    docId: "doc_bm25",
    text: "BM25 (Best Matching 25) is a classic ranking function used by search engines to estimate how relevant a document is to a query, based purely on term statistics rather than any learned representation. It scores a document higher when a query term appears more frequently in that document, but discounts terms that appear in most documents across the whole collection, and normalizes for document length so long documents aren't unfairly favored. Unlike embedding-based search, BM25 has no notion of meaning or synonymy — it only matches surface tokens — which makes it especially strong at retrieving exact identifiers, codes, and rare proper nouns that a query repeats verbatim.",
  },
  {
    docId: "doc_rrf",
    text: "Reciprocal Rank Fusion (RRF) is a simple way to merge several ranked lists of results into a single ranking, without needing the individual lists' scores to be on comparable scales. For each item, RRF sums 1 divided by a constant k plus that item's rank, across every list it appears in, then sorts by the summed score. An item that ranks well in more than one list receives contributions from each of them and tends to float to the top, while an item found by only one method still gets credit but doesn't dominate. This makes RRF a convenient way to combine a semantic vector search ranking with a keyword search ranking, since neither list's raw scores need to be normalized against the other's.",
  },
  {
    docId: "doc_embeddings",
    text: "Text embedding models convert a piece of text into a fixed-length vector of floating point numbers, positioned so that texts with similar meaning end up close together in that vector space, even if they don't share any of the same words. OpenAI's text-embedding-3-small model produces a 1536-dimensional vector for any input text and is commonly used for semantic search, clustering, and recommendation systems. Because the comparison happens in vector space rather than on the raw text, embeddings can match a question to a passage that answers it even when the question is phrased in completely different words than the passage itself.",
  },
  {
    docId: "doc_error_4471",
    text: "Troubleshooting guide: error ERR-4471 appears when the background sync worker cannot acquire a lock on the local cache file, usually because a previous process crashed while holding it. The fix is to stop the application, delete the stale .sync.lock file in the cache directory, and restart — the worker will rebuild its cache automatically on the next run. This error is harmless and does not indicate any data loss. If ERR-4471 recurs immediately after every restart, check that no other process on the machine is also running an instance of the sync worker against the same cache directory.",
  },
  {
    docId: "doc_error_2200",
    text: "Troubleshooting guide: error ERR-2200 appears when the application cannot reach its configured API endpoint within the connection timeout, most commonly because of a firewall rule blocking outbound traffic on the required port. The fix is to confirm the endpoint is reachable from the same machine, then check the local firewall and any corporate proxy settings. This error does not indicate a problem with the application itself. If ERR-2200 persists after confirming connectivity, the API endpoint itself may be experiencing an outage.",
  },
  {
    docId: "doc_pricing_nimbus",
    text: "The Tier-Nimbus-3 plan is priced at $49 per month and includes 50,000 API requests, with a rate limit of 20 requests per second per API key. Overage requests beyond the monthly allotment are billed at $0.002 each. Tier-Nimbus-3 is intended for small production workloads and includes standard email support with a one-business-day response time.",
  },
  {
    docId: "doc_pricing_comet",
    text: "The Tier-Comet-1 plan is priced at $9 per month and includes 5,000 API requests, with a rate limit of 5 requests per second per API key. There is no overage billing on Tier-Comet-1 — requests beyond the monthly allotment are simply rejected until the next billing cycle. Tier-Comet-1 is intended for hobby projects and prototyping and does not include any support SLA.",
  },
  // A "near-duplicate product spec" family: four docs that are ~90% identical
  // template text, differing mainly in a model number and two numbers. This
  // is a known real weak spot for dense embeddings — a short numeric/code
  // token doesn't carry much semantic weight, so four near-identical
  // passages can end up clustered close together in vector space, while
  // BM25's exact term match has no trouble telling them apart.
  {
    docId: "doc_model_x100",
    text: "The Model X100 is a compact wireless sensor designed for indoor environmental monitoring. It measures temperature, humidity, and ambient light, reporting readings over Wi-Fi every 60 seconds. The Model X100 has a battery life of 8 months on a single charge and is priced at $39. It ships with a magnetic mount and is rated for indoor use only.",
  },
  {
    docId: "doc_model_x200",
    text: "The Model X200 is a compact wireless sensor designed for indoor environmental monitoring. It measures temperature, humidity, and ambient light, reporting readings over Wi-Fi every 60 seconds. The Model X200 has a battery life of 14 months on a single charge and is priced at $59. It ships with a magnetic mount and is rated for indoor use only.",
  },
  {
    docId: "doc_model_x300",
    text: "The Model X300 is a compact wireless sensor designed for indoor environmental monitoring. It measures temperature, humidity, and ambient light, reporting readings over Wi-Fi every 60 seconds. The Model X300 has a battery life of 20 months on a single charge and is priced at $79. It ships with a magnetic mount and includes an outdoor-rated weatherproof housing.",
  },
  {
    docId: "doc_model_x400",
    text: "The Model X400 is a compact wireless sensor designed for indoor environmental monitoring. It measures temperature, humidity, and ambient light, reporting readings over Wi-Fi every 60 seconds. The Model X400 has a battery life of 24 months on a single charge and is priced at $99. It ships with a magnetic mount and includes an outdoor-rated weatherproof housing plus a solar trickle-charging panel.",
  },
];

interface TestCase {
  question: string;
  relevantDoc: string;
}

const TEST_SET: TestCase[] = [
  { question: "How does a vector database find the nearest neighbors to a query vector inside Postgres?", relevantDoc: "doc_pgvector" },
  { question: "What's a keyword-based ranking algorithm that scores documents using term frequency and document length, with no learned representation involved?", relevantDoc: "doc_bm25" },
  { question: "How can you merge a semantic search ranking and a keyword search ranking into one list without normalizing their scores?", relevantDoc: "doc_rrf" },
  { question: "How many dimensions does OpenAI's small text embedding model output?", relevantDoc: "doc_embeddings" },
  { question: "What does error ERR-4471 mean and how do I fix it?", relevantDoc: "doc_error_4471" },
  { question: "What does the Tier-Nimbus-3 plan cost per month and what's included?", relevantDoc: "doc_pricing_nimbus" },
  { question: "What is the battery life of the Model X300?", relevantDoc: "doc_model_x300" },
  { question: "How much does the Model X100 cost?", relevantDoc: "doc_model_x100" },
];

async function indexCorpus(): Promise<number> {
  await ensureSchema();
  await sql`DELETE FROM demo_chunks WHERE session_id = ${SESSION_ID}`;

  const chunks = CORPUS.flatMap((doc) => buildChunks(doc.docId, doc.text));
  const embeddings = await embedBatch(chunks.map((c) => c.text));

  await sql.begin(async (tx) => {
    for (let i = 0; i < chunks.length; i++) {
      await tx`
        INSERT INTO demo_chunks (session_id, chunk_id, doc_id, text, embedding)
        VALUES (
          ${SESSION_ID}, ${chunks[i].chunkId}, ${chunks[i].docId}, ${chunks[i].text},
          ${toVectorLiteral(embeddings[i])}::vector
        )
      `;
    }
  });

  return chunks.length;
}

function recallAtK(docIds: string[], relevantDoc: string, k: number): boolean {
  return docIds.slice(0, k).includes(relevantDoc);
}

function reciprocalRank(docIds: string[], relevantDoc: string): number {
  const index = docIds.indexOf(relevantDoc);
  return index === -1 ? 0 : 1 / (index + 1);
}

interface MethodResult {
  label: string;
  recall1: number;
  recall3: number;
  mrr: number;
}

async function evaluateMethod(label: string, retrieve: (question: string) => Promise<string[]>): Promise<MethodResult> {
  let recall1 = 0;
  let recall3 = 0;
  let mrr = 0;

  console.log(`--- ${label} ---`);
  for (const test of TEST_SET) {
    const docIds = await retrieve(test.question);
    const hit1 = recallAtK(docIds, test.relevantDoc, 1);
    const hit3 = recallAtK(docIds, test.relevantDoc, 3);
    const rr = reciprocalRank(docIds, test.relevantDoc);
    recall1 += hit1 ? 1 : 0;
    recall3 += hit3 ? 1 : 0;
    mrr += rr;

    const status = hit1 ? "hit@1  " : hit3 ? "hit@3  " : "miss   ";
    console.log(`  [${status}] "${test.question}"`);
    console.log(`            top: ${docIds[0] ?? "(none)"}  (expected ${test.relevantDoc})`);
  }

  const n = TEST_SET.length;
  const result: MethodResult = { label, recall1: recall1 / n, recall3: recall3 / n, mrr: mrr / n };
  console.log(
    `  Recall@1: ${(result.recall1 * 100).toFixed(0)}%   Recall@3: ${(result.recall3 * 100).toFixed(0)}%   MRR: ${result.mrr.toFixed(3)}\n`,
  );
  return result;
}

async function main() {
  const chunkCount = await indexCorpus();
  console.log(`Indexed ${chunkCount} chunks across ${CORPUS.length} documents into session "${SESSION_ID}".\n`);

  const semanticOnly = await evaluateMethod("Semantic search only (baseline)", async (question) => {
    const queryEmbedding = await embed(question);
    const rows = await semanticSearch(SESSION_ID, queryEmbedding, TOP_K);
    return rows.map((r) => r.doc_id);
  });

  const hybrid = await evaluateMethod("Hybrid: semantic + BM25, RRF-fused (this app's real pipeline)", async (question) => {
    const results = await hybridRetrieve(SESSION_ID, question, TOP_K);
    return results.map((r) => r.docId);
  });

  console.log("=".repeat(72));
  console.log("Summary");
  console.log("=".repeat(72));
  for (const r of [semanticOnly, hybrid]) {
    console.log(
      `${r.label.padEnd(50)} R@1 ${(r.recall1 * 100).toFixed(0).padStart(4)}%  R@3 ${(r.recall3 * 100).toFixed(0).padStart(4)}%  MRR ${r.mrr.toFixed(3)}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql`DELETE FROM demo_chunks WHERE session_id = ${SESSION_ID}`;
    await sql.end();
  });
