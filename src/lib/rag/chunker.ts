/** Direct port of the original tutorial's chunker.py — same defaults, same overlap logic. */

export interface Chunk {
  chunkId: string;
  docId: string;
  text: string;
}

export function chunkText(text: string, chunkSize = 200, overlap = 40): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize - overlap;
  }

  return chunks;
}

export function buildChunks(docId: string, text: string): Chunk[] {
  return chunkText(text).map((chunk, i) => ({
    chunkId: `${docId}_chunk${i}`,
    docId,
    text: chunk,
  }));
}
