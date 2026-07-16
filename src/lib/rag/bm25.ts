/**
 * Minimal BM25 (Okapi) — no dependency needed, it's pure term-frequency math.
 * Direct port of what rank_bm25's BM25Okapi does in the original retriever.py.
 */

const K1 = 1.5;
const B = 0.75;

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

export interface Bm25Doc {
  id: string;
  text: string;
}

export function bm25Search(docs: Bm25Doc[], query: string, topK: number): { id: string; score: number }[] {
  if (docs.length === 0) return [];

  const tokenizedDocs = docs.map((d) => tokenize(d.text));
  const docLengths = tokenizedDocs.map((t) => t.length);
  const avgDocLength = docLengths.reduce((a, b) => a + b, 0) / docLengths.length;

  const df = new Map<string, number>();
  for (const tokens of tokenizedDocs) {
    for (const term of new Set(tokens)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const n = docs.length;
  const idf = (term: string) => {
    const nq = df.get(term) ?? 0;
    return Math.log((n - nq + 0.5) / (nq + 0.5) + 1);
  };

  const queryTerms = tokenize(query);

  const scores = tokenizedDocs.map((tokens, i) => {
    const termCounts = new Map<string, number>();
    for (const t of tokens) termCounts.set(t, (termCounts.get(t) ?? 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const freq = termCounts.get(term) ?? 0;
      if (freq === 0) continue;
      const numerator = freq * (K1 + 1);
      const denominator = freq + K1 * (1 - B + (B * docLengths[i]) / avgDocLength);
      score += idf(term) * (numerator / denominator);
    }
    return { id: docs[i].id, score };
  });

  return scores
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
