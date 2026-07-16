import "server-only";

import { sessionIdFromKey, verifyDemoKey } from "@/lib/demo-session";

export interface DemoAuth {
  ok: true;
  sessionId: string;
}
export interface DemoAuthFailure {
  ok: false;
  status: number;
  error: string;
}

/** Every /api/demo/* route (except key minting) starts with this. */
export function authenticateDemoRequest(request: Request): DemoAuth | DemoAuthFailure {
  const authHeader = request.headers.get("authorization");
  const demoKey = authHeader?.replace(/^Bearer\s+/i, "").trim();
  const check = verifyDemoKey(demoKey);

  if (!check.valid || !demoKey) {
    return {
      ok: false,
      status: 401,
      error: `Invalid demo key (${check.reason}). Reset your session and generate a new one.`,
    };
  }

  return { ok: true, sessionId: sessionIdFromKey(demoKey) };
}
