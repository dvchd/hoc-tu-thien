import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import { UserRole } from "@/domain/value-objects/UserRole";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role as string | undefined;

  const publicRoutes = ["/login", "/"];
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isApiRoute = nextUrl.pathname.startsWith("/api");

  if (isApiRoute) return NextResponse.next();

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
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
