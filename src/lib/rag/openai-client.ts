import "server-only";

import OpenAI from "openai";

/**
 * The internal API key this whole demo runs on — read once, used server-side
 * only, never echoed back in any response. This is "your API key" from the
 * brief: for the public demo everyone shares this key; a production tier
 * would have customers supply their own instead (not built yet — deferred
 * until this actually goes into production).
 */
let client: OpenAI | undefined;

export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local (see .env.example).",
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

/** Chat model for generation. Update to whichever OpenAI model you currently have access to. */
export const CHAT_MODEL = "gpt-4o-mini";
