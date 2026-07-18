import { describe, expect, it } from "vitest";

import { countWords, MAX_INPUT_WORDS } from "@/lib/text-limits";

describe("countWords", () => {
  it("counts words in a simple sentence", () => {
    expect(countWords("the quick brown fox")).toBe(4);
  });

  it("returns 0 for an empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("returns 0 for whitespace-only input", () => {
    expect(countWords("   \n\t  ")).toBe(0);
  });

  it("collapses runs of spaces, tabs, and newlines between words", () => {
    expect(countWords("one   two\tthree\n\nfour")).toBe(4);
  });

  it("ignores leading and trailing whitespace", () => {
    expect(countWords("   padded text here   ")).toBe(3);
  });

  it("counts a single word", () => {
    expect(countWords("word")).toBe(1);
  });
});

describe("MAX_INPUT_WORDS", () => {
  it("is set to the agreed 1000-word cap", () => {
    // Guards against a silent, accidental change to the limit.
    expect(MAX_INPUT_WORDS).toBe(1000);
  });
});
