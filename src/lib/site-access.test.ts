import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkPassphrase, issueAccessToken, verifyAccessToken } from "@/lib/site-access";

describe("checkPassphrase", () => {
  const originalEnv = process.env.ACCESS_PASSPHRASE;
  beforeEach(() => {
    process.env.ACCESS_PASSPHRASE = "Hello1";
  });
  afterEach(() => {
    process.env.ACCESS_PASSPHRASE = originalEnv;
  });

  it("accepts an exact match", () => {
    expect(checkPassphrase("Hello1")).toBe(true);
  });

  it("is case-insensitive, by design", () => {
    expect(checkPassphrase("hello1")).toBe(true);
    expect(checkPassphrase("HELLO1")).toBe(true);
    expect(checkPassphrase("hELLo1")).toBe(true);
  });

  it("rejects a wrong passphrase", () => {
    expect(checkPassphrase("wrong")).toBe(false);
  });

  it("fails closed when unconfigured", () => {
    delete process.env.ACCESS_PASSPHRASE;
    expect(checkPassphrase("anything")).toBe(false);
  });
});

describe("access token issue/verify round trip", () => {
  // This is the regression test for a real bug: an earlier version signed the
  // raw payload string on issue but verified against the base64url-*encoded*
  // payload — two different inputs being signed, so every correct passphrase
  // silently failed. Any future change to issueAccessToken/verifyAccessToken
  // that reintroduces that mismatch should fail right here, not in production.
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a freshly issued token verifies as valid", () => {
    const token = issueAccessToken();
    expect(verifyAccessToken(token)).toBe(true);
  });

  it("rejects an empty or missing token", () => {
    expect(verifyAccessToken(undefined)).toBe(false);
    expect(verifyAccessToken("")).toBe(false);
  });

  it("rejects a token with no signature separator", () => {
    expect(verifyAccessToken("nodothere")).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const token = issueAccessToken();
    const dot = token.lastIndexOf(".");
    const tampered = token.slice(0, dot + 1) + "tampered";
    expect(verifyAccessToken(tampered)).toBe(false);
  });

  it("expires after its TTL", () => {
    const token = issueAccessToken();
    expect(verifyAccessToken(token)).toBe(true);

    vi.advanceTimersByTime(30 * 24 * 60 * 60 * 1000 + 1000); // just past the 30-day TTL
    expect(verifyAccessToken(token)).toBe(false);
  });
});
