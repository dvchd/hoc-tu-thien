import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role as string | undefined;
  const status = session?.user?.status as string | undefined;

  // Debug log — xoá sau khi fix xong
  console.log("[Middleware]", {
    path: nextUrl.pathname,
    isLoggedIn,
    role,
    status,
    userId: session?.user?.id,
  });

  const publicRoutes = ["/login", "/"];
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isActivationRoute = nextUrl.pathname === "/activation";
  const isApiRoute = nextUrl.pathname.startsWith("/api");

  if (isApiRoute) return NextResponse.next();

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Force activation for PENDING_ACTIVATION users
  // Skip if force-refresh cookie is set (activation just completed, JWT being refreshed)
  const isForceRefresh = req.cookies.get("next-auth.force-refresh")?.value === "1";
  if (
    isLoggedIn &&
    status === UserStatus.PENDING_ACTIVATION &&
    !isActivationRoute &&
    !isPublicRoute &&
    !isForceRefresh
  ) {
    return NextResponse.redirect(new URL("/activation", req.url));
  }

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
