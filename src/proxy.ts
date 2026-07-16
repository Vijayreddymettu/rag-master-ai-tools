import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/site-access";

/**
 * Site-wide gate: everything except /access itself (and its check API,
 * plus static assets) requires a valid access cookie. This intentionally
 * covers /api/demo/* too — someone who never passes the passphrase gate
 * shouldn't be able to hit the demo API directly either.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (verifyAccessToken(token)) {
    return NextResponse.next();
  }

  const url = new URL("/access", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!access|api/access|_next/static|_next/image|favicon.ico).*)"],
};
