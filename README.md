# RAG Master AI Tools

A live, hands-on demo of a hybrid-retrieval RAG (Retrieval-Augmented Generation) pipeline:
paste or upload your own text, index it, then ask questions against it — semantic vector
search combined with keyword (BM25) search, fused together, answered by an LLM that's
grounded strictly in your own sources. No external knowledge base, no pre-loaded dataset —
every answer traces back to text you provided in the session.

**Live demo:** the site is deployed and access-gated behind a shared passphrase — ask for access.

## What this actually does

1. **Index** — paste or upload text. It's chunked, embedded, and stored.
2. **Retrieve** — a question gets embedded and run through two searches in parallel:
   semantic similarity (pgvector cosine distance) and keyword matching (BM25). The two
   ranked lists are fused with Reciprocal Rank Fusion, so a chunk that both methods agree on
   floats to the top without needing directly comparable scores from either side.
3. **Generate** — the top-ranked chunks are handed to an LLM with an explicit instruction to
   answer only from what's there. The dashboard shows the answer, every source chunk used,
   which retrieval method(s) actually found each one, live latency and status, and the raw
   JSON response — nothing about how the pipeline behaves is hidden.

## Architecture

```
your text  →  chunker  →  OpenAI embeddings  →  Postgres/pgvector
                                                        │
your question  →  OpenAI embeddings  →  ┌──────────────┴──────────────┐
                                         │  semantic search (pgvector) │
                                         │  keyword search (BM25)      │
                                         └──────────────┬──────────────┘
                                                         │
                                          Reciprocal Rank Fusion (top-K)
                                                         │
                                        LLM generation, grounded in sources only
                                                         │
                                          answer + sources + data lineage
```

Everything runs as a single Next.js app on Vercel — API routes, the retrieval logic, and the
UI all live in one deployable unit, backed by a hosted Postgres (Neon) with the `pgvector`
extension.

## This started as a Python tutorial

The retrieval logic here is a TypeScript port of an earlier project
([`rag-tutorial`](https://github.com/Vijayreddymettu/rag-tutorial)) that ran the same idea
locally in Python. Porting it changed a few things, each for a specific reason:

| | Original (Python) | This version | Why |
|---|---|---|---|
| Embeddings | Local BGE model (`sentence-transformers`) | OpenAI `text-embedding-3-small` API | No local ML model to load inside a serverless function |
| Keyword search | `rank_bm25` | Hand-rolled BM25 (no dependency) | BM25 is just term-frequency math — trivial to port directly |
| Re-ranking | Cross-encoder (`ms-marco-MiniLM`) | Reciprocal Rank Fusion | The cross-encoder has no lightweight JS equivalent without a separate model-serving service, which would defeat the point of a single-deploy app |
| Vector store | Local Docker Postgres/pgvector | Neon (hosted Postgres/pgvector) | Vercel can't reach `localhost` — production needs a real hosted database |
| Generation | OpenAI chat completion | Same | No change needed |

## Access model

This is a public-facing demo, not a finished product — so it's deliberately simple:

- **The whole site sits behind a shared passphrase gate** (`src/proxy.ts`), separate from
  everything else below it. That's an intentional access-control layer, not a product
  feature — it controls who gets to see the demo at all.
- **Once inside, visitors get a temporary "demo key"** — a stateless, signed, short-lived
  token (`src/lib/demo-session.ts`). It isn't a product API key or a database row; it just
  scopes each visitor's indexed data so different sessions never mix, and rate-limits how
  hard any one session can hit the shared OpenAI key behind the scenes.
- **The internal OpenAI key never reaches the browser.** Every visitor is currently using
  the same server-side key. A real product would eventually ask each customer for their own
  key instead of sharing one — that's future scope, not built here.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in OPENAI_API_KEY, DEMO_SESSION_SECRET, ACCESS_PASSPHRASE
docker run -d --name pgvector -e POSTGRES_PASSWORD=password -p 5432:5432 ankane/pgvector
npm run dev
```

Open the dev server, enter the passphrase you set, generate a demo key, paste some text,
index it, and ask a question. See `.env.example` for what each variable does and which ones
can be left blank locally.

## Deployment

Deployed on Vercel with a hosted Neon Postgres provisioned through the Vercel Marketplace
(`vercel integration add neon`, which auto-injects `DATABASE_URL`). Beyond that, the project
needs `OPENAI_API_KEY`, `DEMO_SESSION_SECRET`, and `ACCESS_PASSPHRASE` set in the Vercel
project's environment variables before deploying.
