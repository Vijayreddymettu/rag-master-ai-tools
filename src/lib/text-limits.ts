/**
 * Shared with both the server (indexer.ts, enforces it) and the client
 * (dashboard-client.tsx, shows a live counter) — deliberately has no
 * "server-only" import so it's safe on either side of that boundary.
 */
export const MAX_INPUT_WORDS = 1000; // ~2 pages; keeps chunk count, embedding cost, and latency bounded and easy to reason about

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
