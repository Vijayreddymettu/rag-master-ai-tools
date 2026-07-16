/**
 * Client-side store for the demo dashboard's session, backed by sessionStorage.
 *
 * Built for useSyncExternalStore rather than a useEffect+useState mount check:
 * sessionStorage doesn't exist during SSR, and reading it inside an effect
 * just to setState is exactly the cascading-render pattern
 * react-hooks/set-state-in-effect flags. useSyncExternalStore is React's
 * actual mechanism for this — it has a defined server snapshot (avoids the
 * hydration mismatch) and re-renders automatically when the store changes.
 *
 * The snapshot is kept as a raw string, not a parsed object: useSyncExternalStore
 * compares snapshots with Object.is, and two equal strings are Object.is-equal
 * while two freshly-built objects never are — returning an object here would
 * make React think the store changes on every render.
 */
"use client";

const STORAGE_KEY = "demo_session";

export interface DemoSession {
  key: string;
  expiresAt: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeDemoSession(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDemoSessionSnapshot(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function getDemoSessionServerSnapshot(): string | null {
  return null;
}

export function writeDemoSession(session: DemoSession) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  listeners.forEach((l) => l());
}

export function clearDemoSession() {
  sessionStorage.removeItem(STORAGE_KEY);
  listeners.forEach((l) => l());
}

/** Parses a raw snapshot, and treats an expired session the same as no session. */
export function parseDemoSession(raw: string | null): DemoSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DemoSession;
    if (!parsed.key || !parsed.expiresAt || parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
