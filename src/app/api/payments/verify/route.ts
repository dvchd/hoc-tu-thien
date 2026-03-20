import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { z } from "zod";

const schema = z.object({ paymentId: z.string().min(1) });

export async function POST(req: NextRequest) {
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

    const { verifyPayment } = createUseCases();
    const result = await verifyPayment.execute({
      paymentId: parsed.data.paymentId,
      triggeredBy: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] verify payment:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
