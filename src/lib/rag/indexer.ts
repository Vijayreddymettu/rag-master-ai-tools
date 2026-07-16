import "server-only";

import { buildChunks } from "@/lib/rag/chunker";
import { ensureSchema, sql } from "@/lib/rag/db";
import { embedBatch, toVectorLiteral } from "@/lib/rag/embeddings";

const MAX_INPUT_CHARS = 50_000; // generous for a demo; keeps embedding cost/latency bounded

export class IndexError extends Error {}

export async function indexDocument(
  sessionId: string,
  text: string,
): Promise<{ chunksIndexed: number }> {
  const trimmed = text.trim();
  if (!trimmed) throw new IndexError("Paste or upload some text first.");
  if (trimmed.length > MAX_INPUT_CHARS) {
    throw new IndexError(`That's ${trimmed.length.toLocaleString()} characters — the demo caps input at ${MAX_INPUT_CHARS.toLocaleString()}.`);
  }

  await ensureSchema();

  const docId = `doc_${Date.now()}`;
  const chunks = buildChunks(docId, trimmed);
  const embeddings = await embedBatch(chunks.map((c) => c.text));

  await sql.begin(async (tx) => {
    for (let i = 0; i < chunks.length; i++) {
      await tx`
        INSERT INTO demo_chunks (session_id, chunk_id, doc_id, text, embedding)
        VALUES (
          ${sessionId}, ${chunks[i].chunkId}, ${chunks[i].docId}, ${chunks[i].text},
          ${toVectorLiteral(embeddings[i])}::vector
        )
      `;
    }
  });

  return { chunksIndexed: chunks.length };
}

export async function clearSessionData(sessionId: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM demo_chunks WHERE session_id = ${sessionId}`;
}

export async function sessionChunkCount(sessionId: string): Promise<number> {
  await ensureSchema();
  const [{ count }] = await sql<{ count: string }[]>`
    SELECT count(*)::text FROM demo_chunks WHERE session_id = ${sessionId}
  `;
  return Number(count);
}
