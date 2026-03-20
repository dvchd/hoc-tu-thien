import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { initiateSessionFeePayment } = createUseCases();
    const paymentInfo = await initiateSessionFeePayment.execute(
      params.id,
      session.user.id
    );

    return NextResponse.json(paymentInfo);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
