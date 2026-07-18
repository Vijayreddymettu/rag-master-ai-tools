import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientIp, rateLimit } from "@/lib/demo-rate-limit";

// rateLimit's bucket map is module-scoped and persists across tests in this
// file, so every test uses its own random key to avoid cross-test bleed.
const freshKey = () => `test-${Math.random().toString(36).slice(2)}`;

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first call and reports remaining = limit - 1", () => {
    const result = rateLimit(freshKey(), 3, 60_000);
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("decrements remaining on each call within the window", () => {
    const key = freshKey();
    rateLimit(key, 3, 60_000);
    rateLimit(key, 3, 60_000);
    const third = rateLimit(key, 3, 60_000);
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("rejects once the limit is reached", () => {
    const key = freshKey();
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    const third = rateLimit(key, 2, 60_000);
    expect(third.ok).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("tracks independent buckets per key", () => {
    const a = freshKey();
    const b = freshKey();
    rateLimit(a, 1, 60_000);
    const aSecond = rateLimit(a, 1, 60_000);
    const bFirst = rateLimit(b, 1, 60_000);
    expect(aSecond.ok).toBe(false);
    expect(bFirst.ok).toBe(true);
  });

  it("resets once the window has elapsed", () => {
    const key = freshKey();
    rateLimit(key, 1, 60_000);
    expect(rateLimit(key, 1, 60_000).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    const afterWindow = rateLimit(key, 1, 60_000);
    expect(afterWindow.ok).toBe(true);
    expect(afterWindow.remaining).toBe(0);
  });
});

describe("clientIp", () => {
  it("uses the first address in x-forwarded-for", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientIp(request)).toBe("1.2.3.4");
  });

  it("trims whitespace around the first forwarded address", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "  1.2.3.4  , 5.6.7.8" },
    });
    expect(clientIp(request)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(clientIp(request)).toBe("9.9.9.9");
  });

  it("falls back to \"unknown\" when neither header is present", () => {
    const request = new Request("http://localhost");
    expect(clientIp(request)).toBe("unknown");
  });
});
