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

interface Row {
  chunk_id: string;
  doc_id: string;
  text: string;
}

const POOL_SIZE = 15; // candidates pulled from each method before fusion
const RRF_K = 60; // standard constant from the reciprocal-rank-fusion literature

/**
 * Semantic (pgvector cosine) + BM25 (keyword), fused with Reciprocal Rank
 * Fusion instead of the original's cross-encoder re-ranker.
 *
 * The cross-encoder doesn't have a lightweight JS equivalent — running one
 * means either a Python service or another model download, either of which
 * defeats the point of a single-deploy Vercel app. RRF is the standard
 * dependency-free way to combine two ranked lists: a chunk ranked highly by
 * *both* methods floats to the top, without needing calibrated scores from
 * either side (semantic distance and BM25 score aren't on comparable scales,
 * which is exactly the problem RRF sidesteps by fusing on rank, not score).
 */
export async function hybridRetrieve(
  sessionId: string,
  question: string,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const allChunks = await sql<Row[]>`
    SELECT chunk_id, doc_id, text FROM demo_chunks WHERE session_id = ${sessionId}
  `;
  if (allChunks.length === 0) return [];

  const queryEmbedding = await embed(question);

  const semanticRows = await sql<Row[]>`
    SELECT chunk_id, doc_id, text
    FROM demo_chunks
    WHERE session_id = ${sessionId}
    ORDER BY embedding <=> ${toVectorLiteral(queryEmbedding)}::vector
    LIMIT ${POOL_SIZE}
  `;

  const bm25Results = bm25Search(
    allChunks.map((c) => ({ id: c.chunk_id, text: c.text })),
    question,
    POOL_SIZE,
  );

  const byId = new Map<string, Row>(allChunks.map((c) => [c.chunk_id, c]));
  const fused = new Map<string, number>();
  const foundVia = new Map<string, Set<RetrievalMethod>>();

  const track = (chunkId: string, method: RetrievalMethod, rank: number) => {
    fused.set(chunkId, (fused.get(chunkId) ?? 0) + 1 / (RRF_K + rank + 1));
    if (!foundVia.has(chunkId)) foundVia.set(chunkId, new Set());
    foundVia.get(chunkId)!.add(method);
  };

  semanticRows.forEach((row, rank) => track(row.chunk_id, "semantic", rank));
  bm25Results.forEach((r, rank) => track(r.id, "keyword", rank));

  return [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([chunkId, score]) => {
      const row = byId.get(chunkId)!;
      return {
        chunkId,
        docId: row.doc_id,
        text: row.text,
        score,
        foundVia: [...(foundVia.get(chunkId) ?? [])],
      };
    });
}
