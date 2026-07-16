import "server-only";

import { CHAT_MODEL, getOpenAI } from "@/lib/rag/openai-client";
import type { RetrievedChunk } from "@/lib/rag/retriever";

/** Same grounding rule as the original rag_pipeline.py: answer from sources only. */
export async function generateAnswer(question: string, chunks: RetrievedChunk[]): Promise<string> {
  const context = chunks
    .map((c, i) => `[Source ${i + 1}]: ${c.text}`)
    .join("\n\n");

  const prompt = `You are a helpful assistant. Answer the question using ONLY
the information provided in the sources below. If the answer isn't in the sources,
say so.

SOURCES:
${context}

QUESTION: ${question}

ANSWER:`;

  const response = await getOpenAI().chat.completions.create({
    model: CHAT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  return response.choices[0].message.content ?? "";
}
