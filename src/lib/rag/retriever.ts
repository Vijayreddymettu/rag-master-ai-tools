import "server-only";

import { bm25Search } from "@/lib/rag/bm25";
import { sql } from "@/lib/rag/db";
import { embed, toVectorLiteral } from "@/lib/rag/embeddings";

export type RetrievalMethod = "semantic" | "keyword";

export interface RetrievedChunk {
  chunkId: string;
  docId: string;
  text: string;
  score: number;
  /** Which retrieval method(s) surfaced this chunk — the actual data-lineage trail per source. */
  foundVia: RetrievalMethod[];
}

export interface Row {
  chunk_id: string;
  doc_id: string;
  text: string;
}

const POOL_SIZE = 15; // candidates pulled from each method before fusion
const RRF_K = 60; // standard constant from the reciprocal-rank-fusion literature

export interface FusedResult {
  chunkId: string;
  score: number;
  foundVia: RetrievalMethod[];
}

/**
 * The actual Reciprocal Rank Fusion math, pulled out as a pure function: two
 * ranked ID lists in, one fused ranking out — no database, no OpenAI call, no
 * I/O at all. Split out specifically so it's unit-testable on its own with
 * plain fixture data, instead of only being exercisable through a full
 * database-backed integration test.
 *
 * A chunk ranked highly by *both* methods floats to the top, without needing
 * calibrated scores from either side (semantic distance and BM25 score
 * aren't on comparable scales, which is exactly the problem RRF sidesteps by
 * fusing on rank, not score).
 */
export function fuseRankings(semanticIds: string[], keywordIds: string[], topK: number): FusedResult[] {
  const fused = new Map<string, number>();
  const foundVia = new Map<string, Set<RetrievalMethod>>();

  const track = (chunkId: string, method: RetrievalMethod, rank: number) => {
    fused.set(chunkId, (fused.get(chunkId) ?? 0) + 1 / (RRF_K + rank + 1));
    if (!foundVia.has(chunkId)) foundVia.set(chunkId, new Set());
    foundVia.get(chunkId)!.add(method);
  };

  semanticIds.forEach((id, rank) => track(id, "semantic", rank));
  keywordIds.forEach((id, rank) => track(id, "keyword", rank));

  return [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([chunkId, score]) => ({ chunkId, score, foundVia: [...(foundVia.get(chunkId) ?? [])] }));
}

/** Semantic (pgvector cosine) search alone — also used by scripts/evaluate-retrieval.ts as the baseline hybrid retrieval is measured against. */
export async function semanticSearch(sessionId: string, queryEmbedding: number[], topK: number): Promise<Row[]> {
  return sql<Row[]>`
    SELECT chunk_id, doc_id, text
    FROM demo_chunks
    WHERE session_id = ${sessionId}
    ORDER BY embedding <=> ${toVectorLiteral(queryEmbedding)}::vector
    LIMIT ${topK}
  `;
}

async function allSessionChunks(sessionId: string): Promise<Row[]> {
  return sql<Row[]>`SELECT chunk_id, doc_id, text FROM demo_chunks WHERE session_id = ${sessionId}`;
}

/**
 * Semantic + BM25, fused with Reciprocal Rank Fusion instead of the
 * original's cross-encoder re-ranker.
 *
 * The cross-encoder doesn't have a lightweight JS equivalent — running one
 * means either a Python service or another model download, either of which
 * defeats the point of a single-deploy Vercel app.
 */
export async function hybridRetrieve(
  sessionId: string,
  question: string,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const allChunks = await allSessionChunks(sessionId);
  if (allChunks.length === 0) return [];

  const queryEmbedding = await embed(question);

  const semanticRows = await semanticSearch(sessionId, queryEmbedding, POOL_SIZE);
  const bm25Results = bm25Search(
    allChunks.map((c) => ({ id: c.chunk_id, text: c.text })),
    question,
    POOL_SIZE,
  );

  const byId = new Map<string, Row>(allChunks.map((c) => [c.chunk_id, c]));
  const fused = fuseRankings(
    semanticRows.map((r) => r.chunk_id),
    bm25Results.map((r) => r.id),
    topK,
  );

  return fused.map(({ chunkId, score, foundVia }) => {
    const row = byId.get(chunkId)!;
    return { chunkId, docId: row.doc_id, text: row.text, score, foundVia };
  });
}
