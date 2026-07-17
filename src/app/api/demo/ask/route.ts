import { NextResponse } from "next/server";

import { authenticateDemoRequest } from "@/lib/demo-auth";
import { rateLimit } from "@/lib/demo-rate-limit";
import { AskError, ask } from "@/lib/rag/ask";

const CALLS_PER_WINDOW = 3;
// Longer than a demo key's own 2-hour TTL (see demo-session.ts), so this acts
// as a hard "3 tries per key" cap rather than "3 per hour, indefinitely" — by
// the time the window would reset, the key itself has already expired and a
// fresh one (from Reset Session) starts a new bucket anyway.
const WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours

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
      {
        ok: false,
        status: 429,
        latencyMs: Date.now() - startedAt,
        error: `You've used all ${CALLS_PER_WINDOW} tries for this demo key. Reset your session to get a new key and ${CALLS_PER_WINDOW} more.`,
        triesRemaining: 0,
      },
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
    console.log(`[demo] ask session=${auth.sessionId} status=200 latencyMs=${latencyMs} triesLeft=${limit.remaining}`);
    return NextResponse.json({ ok: true, status: 200, latencyMs, data: result, triesRemaining: limit.remaining });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const status = err instanceof AskError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unexpected error.";
    console.log(`[demo] ask session=${auth.sessionId} status=${status} latencyMs=${latencyMs} error=${message}`);
    return NextResponse.json({ ok: false, status, latencyMs, error: message }, { status });
  }
}
