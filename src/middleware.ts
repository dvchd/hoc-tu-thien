import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import { UserRole } from "@/domain/value-objects/UserRole";

const { auth } = NextAuth(authConfig);

/**
 * Cookie names that represent an active session (not CSRF/state cookies).
 * Only these indicate the user was actually logged in at some point.
 */
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role as string | undefined;

  const publicRoutes = ["/login", "/"];
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isApiRoute = nextUrl.pathname.startsWith("/api");

  if (isApiRoute) return NextResponse.next();

  // Not logged in + not public → redirect to login
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Logged in + trying to access /login → redirect to dashboard
  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Role-based access control — only guard when role is loaded (non-undefined)
  if (isLoggedIn && role) {
    if (nextUrl.pathname.startsWith("/dashboard/admin") && role !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (
      nextUrl.pathname.startsWith("/dashboard/mentor") &&
      role !== UserRole.MENTOR &&
      role !== UserRole.ADMIN
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.ico).*)"],
};
