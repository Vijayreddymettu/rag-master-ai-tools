import { describe, expect, it } from "vitest";

import { buildChunks, chunkText } from "@/lib/rag/chunker";

describe("chunkText", () => {
  it("returns a single chunk for text shorter than the chunk size", () => {
    expect(chunkText("short text")).toEqual(["short text"]);
  });

  it("splits longer text into overlapping windows", () => {
    const text = "a".repeat(500);
    const chunks = chunkText(text, 200, 40);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 200)).toBe(true);
  });

  it("keeps consecutive chunks actually overlapping", () => {
    // distinctive text at each 40-char boundary makes the overlap checkable
    const text = Array.from({ length: 10 }, (_, i) => String(i).repeat(40)).join("");
    const chunks = chunkText(text, 200, 40);
    // the end of chunk N should reappear at the start of chunk N+1
    const tailOfFirst = chunks[0].slice(-40);
    const headOfSecond = chunks[1].slice(0, 40);
    expect(tailOfFirst).toBe(headOfSecond);
  });

  it("returns nothing for empty input", () => {
    expect(chunkText("")).toEqual([]);
  });
});

describe("buildChunks", () => {
  it("tags every chunk with the doc id and a stable chunk id", () => {
    const chunks = buildChunks("doc1", "a".repeat(250));
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.docId).toBe("doc1");
    }
    expect(chunks[0].chunkId).toBe("doc1_chunk0");
    expect(chunks[1].chunkId).toBe("doc1_chunk1");
  });
});
