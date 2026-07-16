import { NextResponse } from "next/server";

import { clientIp, rateLimit } from "@/lib/demo-rate-limit";
import { ACCESS_COOKIE, checkPassphrase, issueAccessToken } from "@/lib/site-access";

const ATTEMPTS_PER_WINDOW = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour — a passphrase gate needs brute-force protection too

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(`access:${ip}`, ATTEMPTS_PER_WINDOW, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const passphrase = typeof body.passphrase === "string" ? body.passphrase : "";

  if (!checkPassphrase(passphrase)) {
    return NextResponse.json({ ok: false, error: "Incorrect passphrase." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, issueAccessToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
