import { NextResponse } from "next/server";

import { clientIp, rateLimit } from "@/lib/demo-rate-limit";
import { issueDemoKey } from "@/lib/demo-session";

const MINTS_PER_WINDOW = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(`mint:${ip}`, MINTS_PER_WINDOW, WINDOW_MS);

  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many demo keys requested from this network. Try again later." },
      { status: 429 },
    );
  }

  const { key, expiresAt } = issueDemoKey();
  return NextResponse.json({ key, expiresAt });
}
