import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  if (isAuthRoute) return NextResponse.next();

  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isLoginPage) {
    const dashboardUrl = new URL("/", req.nextUrl.origin);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
