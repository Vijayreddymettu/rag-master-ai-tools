import { NextResponse } from "next/server";

import { authenticateDemoRequest } from "@/lib/demo-auth";
import { rateLimit } from "@/lib/demo-rate-limit";
import { IndexError, indexDocument } from "@/lib/rag/indexer";

const CALLS_PER_WINDOW = 15;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** "Paste or upload their data" from the brief lands here — chunks, embeds, stores it. */
export async function POST(request: Request) {
  const startedAt = Date.now();
  const auth = authenticateDemoRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, status: auth.status, latencyMs: Date.now() - startedAt, error: auth.error }, { status: auth.status });
  }

  const limit = rateLimit(`index:${auth.sessionId}`, CALLS_PER_WINDOW, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, status: 429, latencyMs: Date.now() - startedAt, error: `Demo rate limit reached (${CALLS_PER_WINDOW}/hr). Resets ${new Date(limit.resetAt).toLocaleTimeString()}.` },
      { status: 429 },
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, status: 400, latencyMs: Date.now() - startedAt, error: "Malformed request body." }, { status: 400 });
  }

  try {
    const result = await indexDocument(auth.sessionId, body.text ?? "");
    const latencyMs = Date.now() - startedAt;
    console.log(`[demo] index session=${auth.sessionId} chunks=${result.chunksIndexed} status=200 latencyMs=${latencyMs}`);
    return NextResponse.json({ ok: true, status: 200, latencyMs, data: result });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const status = err instanceof IndexError ? 400 : 500;
    const message = err instanceof Error ? err.message : "Unexpected error.";
    console.log(`[demo] index session=${auth.sessionId} status=${status} latencyMs=${latencyMs} error=${message}`);
    return NextResponse.json({ ok: false, status, latencyMs, error: message }, { status });
  }
}
