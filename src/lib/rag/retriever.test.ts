import { describe, expect, it } from "vitest";

import { fuseRankings } from "@/lib/rag/retriever";

describe("fuseRankings", () => {
  it("ranks a chunk found by both methods above one found by only one", () => {
    // "shared" is #1 semantic and #2 keyword; "semanticOnly" is #2 semantic only.
    const result = fuseRankings(["shared", "semanticOnly"], ["keywordOnly", "shared"], 5);
    expect(result[0].chunkId).toBe("shared");
    expect(result[0].foundVia.sort()).toEqual(["keyword", "semantic"]);
  });

  it("tags single-method results with only that method", () => {
    const result = fuseRankings(["a"], ["b"], 5);
    const a = result.find((r) => r.chunkId === "a")!;
    const b = result.find((r) => r.chunkId === "b")!;
    expect(a.foundVia).toEqual(["semantic"]);
    expect(b.foundVia).toEqual(["keyword"]);
  });

  it("gives a better (higher) score to a higher rank within a list", () => {
    const result = fuseRankings(["first", "second", "third"], [], 5);
    const scoreOf = (id: string) => result.find((r) => r.chunkId === id)!.score;
    expect(scoreOf("first")).toBeGreaterThan(scoreOf("second"));
    expect(scoreOf("second")).toBeGreaterThan(scoreOf("third"));
  });

  it("respects topK", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `id${i}`);
    const result = fuseRankings(ids, [], 3);
    expect(result).toHaveLength(3);
  });

  it("handles two completely empty lists", () => {
    expect(fuseRankings([], [], 5)).toEqual([]);
  });

  it("doesn't duplicate a chunk that appears in both lists", () => {
    const result = fuseRankings(["x"], ["x"], 5);
    expect(result).toHaveLength(1);
  });
});
