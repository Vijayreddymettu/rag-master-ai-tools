/**
 * Demo dashboard session tokens.
 *
 * This gate gets people into the dashboard and throttles how hard they can
 * hit the shared OpenAI key — it is NOT a customer account or API-key
 * system. A "demo key" is a stateless, signed, short-lived token:
 * `demo_<payload>.<signature>`, an HMAC over the payload with a server-only
 * secret. Verifying one is pure computation, no DB row, nothing to leak in a
 * table dump — this is what "customer keys are never stored permanently"
 * means here. It also doubles as the session_id that scopes each visitor's
 * indexed documents in Postgres (see lib/rag/db.ts).
 *
 * Production is different: real customers will authenticate with their own
 * API key against the internal one, the way the original brief describes.
 * That's deliberately not built yet — this demo runs entirely on the
 * internal OPENAI_API_KEY so anyone can try it with zero setup.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours — long enough for one evaluation session
const PREFIX = "demo_";

/**
 * Falls back to a random per-process secret so local dev works with zero
 * setup. NOT safe in production: Vercel runs multiple instances, and each
 * would mint tokens the others can't verify, so real deployments must set
 * DEMO_SESSION_SECRET explicitly (see .env.example).
 */
export function resolveSecret(): string {
  const fromEnv = process.env.DEMO_SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.VERCEL) {
    throw new Error(
      "DEMO_SESSION_SECRET is not set. Required in production — set it in the Vercel project's environment variables.",
    );
  }

  if (!devSecret) {
    devSecret = randomBytes(32).toString("hex");
    console.warn(
      "[demo] DEMO_SESSION_SECRET not set — using a random per-process secret for local dev. " +
        "Demo keys will stop validating if the dev server restarts.",
    );
  }
  return devSecret;
}
let devSecret: string | undefined;

interface Payload {
  iat: number;
  exp: number;
}

function sign(payload: string): string {
  return createHmac("sha256", resolveSecret()).update(payload).digest("base64url");
}

export function issueDemoKey(): { key: string; expiresAt: number } {
  const now = Date.now();
  const payload: Payload = { iat: now, exp: now + TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const key = `${PREFIX}${encoded}.${sign(encoded)}`;
  return { key, expiresAt: payload.exp };
}

export interface DemoKeyCheck {
  valid: boolean;
  expiresAt?: number;
  reason?: string;
}

export function verifyDemoKey(key: string | null | undefined): DemoKeyCheck {
  if (!key || !key.startsWith(PREFIX)) {
    return { valid: false, reason: "missing or malformed key" };
  }

  const body = key.slice(PREFIX.length);
  const dot = body.lastIndexOf(".");
  if (dot === -1) return { valid: false, reason: "malformed key" };

  const encoded = body.slice(0, dot);
  const signature = body.slice(dot + 1);
  const expected = sign(encoded);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "bad signature" };
  }

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return { valid: false, reason: "malformed payload" };
  }

  if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, expiresAt: payload.exp };
}

/** The demo key IS the session id — one less identifier to keep in sync. */
export function sessionIdFromKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}
