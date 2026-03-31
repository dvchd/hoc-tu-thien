import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { z } from "zod";
import { withAllowedMethods } from "@/lib/api-utils";

const schema = z.object({ sessionId: z.string().min(1) });

export const POST = withAllowedMethods(["POST"], async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { initiateSessionFeePayment } = createUseCases();
    const info = await initiateSessionFeePayment.execute(
      parsed.data.sessionId,
      session.user.id
    );

    return NextResponse.json(info);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lỗi hệ thống" },
      { status: 400 }
    );
  }
});
