import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { withAllowedMethods } from "@/lib/api-utils";

export const POST = withAllowedMethods(["POST"], async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { markNoShow } = createUseCases();
    const result = await markNoShow.execute(params.id, session.user.id);

    return NextResponse.json({
      success: true,
      session: result,
      message: result.fee > 0
        ? "Đã đánh dấu Mentee vắng mặt. Mentee vẫn cần thanh toán học phí."
        : "Đã đánh dấu Mentee vắng mặt.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
