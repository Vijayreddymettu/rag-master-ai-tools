/**
 * Postgres/pgvector connection and schema for the demo's chunk store.
 *
 * Local dev points at the same Docker pgvector container the original Python
 * tutorial used (localhost:5432, postgres/postgres/password). Production
 * needs a real hosted Postgres with the pgvector extension (e.g. Neon) — set
 * DATABASE_URL and this connects to that instead. See .env.example.
 *
 * Every row is tagged with the demo session's id so one visitor's pasted
 * documents never leak into another's retrieval results, and so a full
 * cleanup on "Reset Session" is one indexed DELETE.
 */
import "server-only";

import postgres from "postgres";

const DEFAULT_LOCAL_URL = "postgres://postgres:password@localhost:5432/postgres";

export const sql = postgres(process.env.DATABASE_URL || DEFAULT_LOCAL_URL, {
  max: 5,
});

let schemaReady: Promise<void> | undefined;

/** Idempotent — safe to call before every request, cheap after the first. */
export function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    await sql`
      CREATE TABLE IF NOT EXISTS demo_chunks (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        chunk_id TEXT NOT NULL,
        doc_id TEXT NOT NULL,
        text TEXT NOT NULL,
        embedding vector(1536) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS demo_chunks_session_idx ON demo_chunks (session_id)`;
    await sql`
      CREATE INDEX IF NOT EXISTS demo_chunks_embedding_idx
      ON demo_chunks USING ivfflat (embedding vector_cosine_ops)
    `;
    // A per-key counter that has to live in the database, not in-memory: Vercel
    // runs multiple concurrent instances, each with its own separate memory, so
    // an in-process counter can't enforce a hard cap — two requests landing on
    // two different instances would each think they're the first ask. Postgres
    // is the one thing every instance actually shares.
    await sql`
      CREATE TABLE IF NOT EXISTS demo_ask_counts (
        session_id TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  })();
  return schemaReady;
}
