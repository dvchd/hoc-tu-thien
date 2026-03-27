import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { prisma } from "@/infrastructure/database/prisma/client";
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

    const { getMentorSessions } = createUseCases();
    // Find session by ID - return all sessions for the user and filter
    const sessions = await getMentorSessions.byMenteeId(session.user.id);
    const found = sessions.find((s) => s.id === params.id);
    if (!found) {
      // Try as mentor
      const mentorSessions = await getMentorSessions.byMentorId(session.user.id);
      const foundAsMentor = mentorSessions.find((s) => s.id === params.id);
      if (!foundAsMentor) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(foundAsMentor);
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
        // Nếu late cancellation, cập nhật counter
        if (result.isLateCancellation) {
          await prisma.user.update({
            where: { id: userId },
            data: { lateCancellationCount: { increment: 1 } },
          }).catch(() => { /* ignore */ });
        }
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
