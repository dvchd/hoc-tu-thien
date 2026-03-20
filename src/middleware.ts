import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;

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
  if (
    isLoggedIn &&
    session.user.status === UserStatus.PENDING_ACTIVATION &&
    !isActivationRoute &&
    !isPublicRoute
  ) {
    return NextResponse.redirect(new URL("/activation", req.url));
  }

  const role = session?.user?.role;

  if (nextUrl.pathname.startsWith("/dashboard/admin") && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (nextUrl.pathname.startsWith("/dashboard/mentor") && role !== UserRole.MENTOR && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
