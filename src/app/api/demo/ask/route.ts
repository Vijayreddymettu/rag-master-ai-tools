import { NextResponse } from "next/server";

import { authenticateDemoRequest } from "@/lib/demo-auth";
import { rateLimit } from "@/lib/demo-rate-limit";
import { AskError, ask } from "@/lib/rag/ask";

const CALLS_PER_WINDOW = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * The demo's "Run API" action: customer's demo key authorizes the call, the
 * server's own OPENAI_API_KEY (via lib/rag/openai-client.ts) does the actual
 * embedding + generation work. The customer never sees that key, and it
 * never appears in this response.
 */
export async function POST(request: Request) {
  const startedAt = Date.now();
  const auth = authenticateDemoRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, status: auth.status, latencyMs: Date.now() - startedAt, error: auth.error }, { status: auth.status });
  }

  const limit = rateLimit(`ask:${auth.sessionId}`, CALLS_PER_WINDOW, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, status: 429, latencyMs: Date.now() - startedAt, error: `Demo rate limit reached (${CALLS_PER_WINDOW}/hr). Resets ${new Date(limit.resetAt).toLocaleTimeString()}.` },
      { status: 429 },
    );
  }

  let body: { question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, status: 400, latencyMs: Date.now() - startedAt, error: "Malformed request body." }, { status: 400 });
  }

  try {
    const result = await ask(auth.sessionId, body.question ?? "");
    const latencyMs = Date.now() - startedAt;
    console.log(`[demo] ask session=${auth.sessionId} status=200 latencyMs=${latencyMs}`);
    return NextResponse.json({ ok: true, status: 200, latencyMs, data: result });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const status = err instanceof AskError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unexpected error.";
    console.log(`[demo] ask session=${auth.sessionId} status=${status} latencyMs=${latencyMs} error=${message}`);
    return NextResponse.json({ ok: false, status, latencyMs, error: message }, { status });
  }
}
