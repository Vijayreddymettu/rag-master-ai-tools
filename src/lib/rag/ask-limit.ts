import "server-only";

import { ensureSchema, sql } from "@/lib/rag/db";

export interface AskLimitResult {
  ok: boolean;
  remaining: number;
}

/**
 * Atomically increments this session's ask count and reports whether it's
 * still within the limit. `INSERT ... ON CONFLICT DO UPDATE` is a single
 * statement, so Postgres serializes concurrent increments for the same
 * session_id via normal row locking — no read-then-write race between two
 * requests hitting different serverless instances at the same moment.
 */
export async function checkAndIncrementAskCount(sessionId: string, limit: number): Promise<AskLimitResult> {
  await ensureSchema();

  const [{ count }] = await sql<{ count: number }[]>`
    INSERT INTO demo_ask_counts (session_id, count, updated_at)
    VALUES (${sessionId}, 1, now())
    ON CONFLICT (session_id) DO UPDATE
      SET count = demo_ask_counts.count + 1, updated_at = now()
    RETURNING count
  `;

  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}
