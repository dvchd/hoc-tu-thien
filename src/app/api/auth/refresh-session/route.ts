import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/infrastructure/database/prisma/client";

/**
 * GET /api/auth/refresh-session
 *
 * Force-refreshes the JWT by clearing all NextAuth session cookies.
 * Called after activation payment is verified — the DB status is now ACTIVE
 * but the JWT still holds PENDING_ACTIVATION (JWT is not re-issued automatically).
 *
 * After clearing cookies the browser is redirected to /api/auth/session which
 * triggers NextAuth to re-issue a fresh JWT with the latest DB values.
 */
export async function GET(req: NextRequest) {
  const session = await auth();

  // Only allow logged-in users
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Verify DB status is actually ACTIVE before allowing refresh
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true },
  });

  const redirectTo = req.nextUrl.searchParams.get("redirectTo") ?? "/dashboard";
  const destination = new URL(redirectTo, req.url);

  // Build response that clears all NextAuth cookies so next request
  // triggers a fresh JWT with updated DB values
  const res = NextResponse.redirect(destination);

  // Clear every NextAuth cookie variant (both secure and non-secure names)
  const cookiesToClear = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
  ];

  for (const name of cookiesToClear) {
    res.cookies.set(name, "", {
      httpOnly: true,
      path: "/",
      expires: new Date(0), // epoch = delete
      sameSite: "lax",
    });
  }

  // If DB says ACTIVE, also set a flag cookie so middleware knows
  // the refresh is in progress and should not redirect to /activation
  if (dbUser?.status === "ACTIVE") {
    res.cookies.set("next-auth.force-refresh", "1", {
      httpOnly: false,
      path: "/",
      maxAge: 10, // 10 seconds — consumed on the next page load
      sameSite: "lax",
    });
  }

  return res;
}
