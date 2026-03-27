import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["confirm", "confirm_completion", "cancel", "rate"]),
  meetLink: z.string().url().optional(),
  mentorNotes: z.string().max(1000).optional(),
  cancelReason: z.string().max(500).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  ratingComment: z.string().max(500).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uow } = createUseCases();
    // Lấy trực tiếp bằng ID — O(1) thay vì scan toàn bộ sessions
    const found = await uow.sessions.findById(params.id);
    if (!found) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Kiểm tra quyền: chỉ mentee hoặc mentor của session mới được xem
    if (found.menteeId !== session.user.id && found.mentorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(found);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { confirmSession, confirmCompletion, cancelSession, rateSession } = createUseCases();
    const sessionId = params.id;
    const userId = session.user.id;

    let result;

    switch (parsed.data.action) {
      case "confirm":
        result = await confirmSession.execute(sessionId, userId, parsed.data.meetLink);
        break;

      case "confirm_completion":
        result = await confirmCompletion.execute(sessionId, userId, parsed.data.meetLink);
        break;

      case "cancel":
        result = await cancelSession.execute(sessionId, userId, parsed.data.cancelReason);
        break;

      case "rate":
        if (!parsed.data.rating) {
          return NextResponse.json({ error: "Rating is required" }, { status: 400 });
        }
        result = await rateSession.execute(
          sessionId,
          userId,
          parsed.data.rating,
          parsed.data.ratingComment
        );
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
