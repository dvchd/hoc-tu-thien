import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/domain/value-objects/UserRole";

const { auth } = NextAuth(authConfig);

/**
 * Cookie names used by NextAuth v5 (@auth/core).
 * We clear these when a stale/unreadable JWT is detected so the user
 * gets a clean re-login instead of hitting the error boundary.
 */
const AUTH_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Secure-authjs.csrf-token",
  "authjs.pkce.code_verifier",
  "__Secure-authjs.pkce.code_verifier",
];

function clearAuthCookies(request: NextRequest, redirectTo: string) {
  const loginUrl = new URL(redirectTo, request.url);
  const response = NextResponse.redirect(loginUrl);
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.delete(name);
  }
  return response;
}

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role as string | undefined;

  const publicRoutes = ["/login", "/"];
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isApiRoute = nextUrl.pathname.startsWith("/api");

  if (isApiRoute) return NextResponse.next();

  // --- Stale JWT cookie detection ---
  // When the app is rebuilt/deployed with a different AUTH_SECRET, the old JWT
  // cookie cannot be decrypted. NextAuth returns `null` session but the cookie
  // remains, causing repeated errors. Detect this by checking if an auth cookie
  // exists but session is null (for non-public routes).
  if (!isLoggedIn && !isPublicRoute) {
    // Check if any auth cookie is present — indicates a stale/invalid session
    const hasAuthCookie = AUTH_COOKIE_NAMES.some(
      (name) => req.cookies.get(name)
    );
    if (hasAuthCookie) {
      // Stale cookie detected — clear all auth cookies and redirect to login
      return clearAuthCookies(req, "/login?error=SessionExpired");
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // On public routes, silently clear stale cookies so the user gets a fresh session
  if (!isLoggedIn && isPublicRoute) {
    const hasAuthCookie = AUTH_COOKIE_NAMES.some(
      (name) => req.cookies.get(name)
    );
    if (hasAuthCookie) {
      return clearAuthCookies(req, nextUrl.pathname);
    }
  }

  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Kích hoạt tài khoản là tuỳ chọn (không bắt buộc).
  // Chỉ redirect về /activation nếu user tự điều hướng đến đó,
  // không cần chặn họ khỏi dashboard hay các route khác.

  // Chỉ chặn nếu đã login mà role không đúng
  // Không chặn nếu role chưa load (undefined) — tránh false redirect
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
