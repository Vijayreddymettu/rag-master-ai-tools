import { NextResponse } from "next/server";

import { authenticateDemoRequest } from "@/lib/demo-auth";
import { sessionChunkCount } from "@/lib/rag/indexer";

/**
 * Lets the dashboard recover "how much is indexed" after a page refresh —
 * totalChunks is otherwise just client state, but the underlying rows in
 * Postgres persist until an explicit Reset Session.
 */
export async function GET(request: Request) {
  const auth = authenticateDemoRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const chunksIndexed = await sessionChunkCount(auth.sessionId);
  return NextResponse.json({ chunksIndexed });
}
