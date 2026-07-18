import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { issueDemoKey, sessionIdFromKey, verifyDemoKey } from "@/lib/demo-session";

describe("demo session tokens", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips: a freshly issued key verifies as valid", () => {
    const { key } = issueDemoKey();
    expect(verifyDemoKey(key).valid).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const { key } = issueDemoKey();
    const [prefix, sig] = key.split(".");
    const tampered = `${prefix}x.${sig}`; // corrupt the encoded payload
    expect(verifyDemoKey(tampered).valid).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const { key } = issueDemoKey();
    const [prefix, sig] = key.split(".");
    const tampered = `${prefix}.${sig.slice(0, -1)}x`;
    expect(verifyDemoKey(tampered).valid).toBe(false);
  });

  it("rejects missing, empty, and malformed keys", () => {
    expect(verifyDemoKey(undefined).valid).toBe(false);
    expect(verifyDemoKey(null).valid).toBe(false);
    expect(verifyDemoKey("").valid).toBe(false);
    expect(verifyDemoKey("not-a-real-key").valid).toBe(false);
    expect(verifyDemoKey("demo_missingdot").valid).toBe(false);
  });

  it("expires after its TTL", () => {
    const { key } = issueDemoKey();
    expect(verifyDemoKey(key).valid).toBe(true);

    vi.advanceTimersByTime(2 * 60 * 60 * 1000 + 1000); // just past the 2-hour TTL
    expect(verifyDemoKey(key).valid).toBe(false);
  });

  it("derives a stable, deterministic session id from the same key", () => {
    const { key } = issueDemoKey();
    expect(sessionIdFromKey(key)).toBe(sessionIdFromKey(key));
  });

  it("derives different session ids for different keys", () => {
    const a = issueDemoKey().key;
    vi.advanceTimersByTime(1); // guarantee a different iat so the two keys actually differ
    const b = issueDemoKey().key;
    expect(sessionIdFromKey(a)).not.toBe(sessionIdFromKey(b));
  });
});
