import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { z } from "zod";

const schema = z.object({
  meetLink: z.string().url().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);

    const { confirmCompletion } = createUseCases();
    const result = await confirmCompletion.execute(
      params.id,
      session.user.id,
      parsed.success ? parsed.data.meetLink : undefined
    );

    const isBothConfirmed = result.mentorConfirmed && result.menteeConfirmed;
    const message = isBothConfirmed
      ? "Buổi học đã được xác nhận hoàn tất bởi cả hai bên!"
      : result.mentorConfirmed
        ? "Mentor đã xác nhận. Chờ Mentee xác nhận để hoàn tất."
        : "Mentee đã xác nhận. Chờ Mentor xác nhận để hoàn tất.";

    return NextResponse.json({ success: true, session: result, message });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
