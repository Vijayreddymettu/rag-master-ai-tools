/**
 * Site-wide access gate — separate from the demo dashboard's session key.
 *
 * This one's about "who can even see the site at all": a single shared
 * passphrase (ACCESS_PASSPHRASE) that Vijay hands out to specific people. It
 * has nothing to do with rate-limiting or per-visitor data scoping — that's
 * what the demo-session token (src/lib/demo-session.ts) is for. Someone
 * needs to pass THIS gate before they ever reach the dashboard's own gate.
 *
 * The passphrase itself is never stored in the cookie — only a signed,
 * time-limited token proving it was checked correctly server-side once.
 */
import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { resolveSecret } from "@/lib/demo-session";

export const ACCESS_COOKIE = "site_access";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — this is a "did I already get let in" cookie, not a security-sensitive session
const PAYLOAD_PREFIX = "site-access:"; // keeps this token unmistakable from a demo key, even though they may share a signing secret

export function checkPassphrase(input: string): boolean {
  const expected = process.env.ACCESS_PASSPHRASE;
  if (!expected) return false; // fail closed if the site isn't configured yet

  // Case-insensitive by design — normalize both sides before the constant-time
  // compare, so people sharing/typing the passphrase don't trip over casing.
  const a = Buffer.from(input.toLowerCase());
  const b = Buffer.from(expected.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issueAccessToken(): string {
  const payload = `${PAYLOAD_PREFIX}${Date.now() + TTL_MS}`;
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", resolveSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;

  const encodedPayload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expectedSignature = createHmac("sha256", resolveSecret()).update(encodedPayload).digest("base64url");

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  if (!payload.startsWith(PAYLOAD_PREFIX)) return false;

  const expiresAt = Number(payload.slice(PAYLOAD_PREFIX.length));
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
