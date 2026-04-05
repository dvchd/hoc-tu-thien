import { NextRequest, NextResponse } from "next/server";
import { encode } from "@auth/core/jwt";
import { prisma } from "@/infrastructure/database/prisma/client";
import { withAllowedMethods } from "@/lib/api-utils";

/**
 * API route CHỈ dùng trong môi trường E2E test.
 * Tạo JWT session token để Playwright có thể set cookie và bypass Google OAuth.
 * Bị block hoàn toàn ở production (khi không có E2E_TEST_MODE).
 */
export const POST = withAllowedMethods(["POST"], async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && !process.env.E2E_TEST_MODE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found: " + userId }, { status: 404 });
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";

  // next-auth v5 (@auth/core) dùng salt = "authjs.session-token"
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      image: user.image ?? null,
      role: user.role,
      status: user.status,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    },
    secret,
    salt: "authjs.session-token",
  });

  return NextResponse.json({ token });
});
