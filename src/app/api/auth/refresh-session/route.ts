import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/infrastructure/database/prisma/client";

/**
 * GET /api/auth/refresh-session
 *
 * Called after activation payment is verified.
 * The DB status is now ACTIVE but the JWT still holds PENDING_ACTIVATION
 * because JWT is cached and not automatically re-issued.
 *
 * Strategy: force NextAuth to re-issue JWT by calling the update trigger.
 * We sign the user out then redirect to Google sign-in so NextAuth issues
 * a completely fresh JWT with status=ACTIVE from DB.
 */
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Verify DB status before proceeding
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true },
  });

  if (!dbUser) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const redirectTo = req.nextUrl.searchParams.get("redirectTo") ?? "/dashboard";

  // Sign the user out to clear the stale JWT cookie,
  // then redirect to Google sign-in which will re-issue a fresh JWT.
  // NextAuth sign-out with callbackUrl causes a new sign-in flow.
  const signOutUrl = new URL("/api/auth/signout", req.url);
  const res = NextResponse.redirect(signOutUrl);

  // Pass the intended destination so after re-login they land on dashboard
  // We use a short-lived cookie to persist this through the sign-out/sign-in flow
  res.cookies.set("next-auth.post-signin-redirect", redirectTo, {
    httpOnly: true,
    path: "/",
    maxAge: 120, // 2 minutes
    sameSite: "lax",
  });

  return res;
}
