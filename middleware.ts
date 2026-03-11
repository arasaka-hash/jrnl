import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "jrnl_auth";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isLoggedIn = request.cookies.get(AUTH_COOKIE)?.value === "1";

  if (path === "/login") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login"],
};
