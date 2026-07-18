import { describe, expect, it } from "vitest";

import { bm25Search } from "@/lib/rag/bm25";

describe("bm25Search", () => {
  it("ranks a doc containing the exact query term above one that doesn't", () => {
    const docs = [
      { id: "a", text: "the quick brown fox jumps over the lazy dog" },
      { id: "b", text: "completely unrelated text about something else entirely" },
    ];
    const results = bm25Search(docs, "fox", 5);
    expect(results[0]?.id).toBe("a");
  });

  it("returns an empty array when there are no documents", () => {
    expect(bm25Search([], "anything", 5)).toEqual([]);
  });

  it("excludes documents that share no terms with the query", () => {
    const docs = [{ id: "a", text: "apples and oranges" }];
    const results = bm25Search(docs, "zebra giraffe", 5);
    expect(results).toEqual([]);
  });

  it("respects the topK limit", () => {
    const docs = Array.from({ length: 10 }, (_, i) => ({ id: `doc${i}`, text: "shared keyword appears here" }));
    const results = bm25Search(docs, "keyword", 3);
    expect(results).toHaveLength(3);
  });

  it("is case-insensitive", () => {
    const docs = [{ id: "a", text: "The Quick Brown Fox" }];
    expect(bm25Search(docs, "quick", 5)).toHaveLength(1);
    expect(bm25Search(docs, "QUICK", 5)).toHaveLength(1);
  });
});
