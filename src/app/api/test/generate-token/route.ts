import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/infrastructure/database/prisma/client";

export async function POST(req: NextRequest) {
  // Chỉ cho phép chạy ở local/test
  if (process.env.NODE_ENV === "production" && !process.env.E2E_TEST_MODE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { email } = body;

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Tạo user dummy nếu không tồn tại
    user = await prisma.user.create({
      data: {
        id: `test_user_${Date.now()}`,
        email,
        name: email.split("@")[0],
        role: email.includes("admin") ? "ADMIN" : email.includes("mentor") ? "MENTOR" : "MENTEE",
        status: "ACTIVE",
        version: 1,
      },
    });
  }

  const token = await encode({
    token: {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    },
    secret: process.env.NEXTAUTH_SECRET || "REPLACE_WITH_A_STRONG_RANDOM_SECRET_32_CHARS_LONG",
    salt: "next-auth.session-token",
  });

  return NextResponse.json({ token, user });
}
