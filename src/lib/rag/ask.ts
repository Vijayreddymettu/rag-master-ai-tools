import "server-only";

import { generateAnswer } from "@/lib/rag/generate";
import { hybridRetrieve, type RetrievedChunk } from "@/lib/rag/retriever";

export class AskError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AskError";
  }
}

export interface AskResult {
  answer: string;
  sources: RetrievedChunk[];
}

/** Mirrors rag_pipeline.py's ask(): retrieve, then generate a grounded answer. */
export async function ask(sessionId: string, question: string): Promise<AskResult> {
  const trimmed = question.trim();
  if (!trimmed) throw new AskError("Ask a question first.", 400);

  const sources = await hybridRetrieve(sessionId, trimmed, 3);
  if (sources.length === 0) {
    throw new AskError("No documents indexed yet for this session — paste or upload something first.", 409);
  }

  const answer = await generateAnswer(trimmed, sources);
  return { answer, sources };
}
