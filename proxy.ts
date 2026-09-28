import { NextResponse, type NextRequest } from "next/server";

// The browser only ever talks to this origin. Requests to /api/v1 are forwarded to
// the PurrOS API so the session cookie stays first-party and the API's Origin
// check (PURROS_URL) matches the address people use. PURROS_API_URL is read per
// request, so one built image works in any environment.
export function proxy(request: NextRequest) {
  const apiUrl = (process.env.PURROS_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
  const { pathname, search } = request.nextUrl;
  return NextResponse.rewrite(new URL(`${pathname}${search}`, apiUrl));
}

export const config = {
  matcher: "/api/v1/:path*",
};
