import "server-only";

import { getOpenAI } from "@/lib/rag/openai-client";

/** text-embedding-3-small: 1536 dims — matches the `vector(1536)` column in db.ts. */
const MODEL = "text-embedding-3-small";

export async function embed(text: string): Promise<number[]> {
  const res = await getOpenAI().embeddings.create({ model: MODEL, input: text });
  return res.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await getOpenAI().embeddings.create({ model: MODEL, input: texts });
  return res.data.map((d) => d.embedding);
}

/** pgvector's literal syntax for a vector column value. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
