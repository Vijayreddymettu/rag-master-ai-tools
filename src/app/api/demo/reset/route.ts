import { NextResponse } from "next/server";

import { authenticateDemoRequest } from "@/lib/demo-auth";
import { clearSessionData } from "@/lib/rag/indexer";

/** Deletes this session's indexed chunks server-side — not just the client's local key. */
export async function POST(request: Request) {
  const auth = authenticateDemoRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  await clearSessionData(auth.sessionId);
  return NextResponse.json({ ok: true });
}
