import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { z } from "zod";

const bookSchema = z.object({
  mentorId: z.string().min(1),
  teachingFieldId: z.string().optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(30).max(180).default(60),
  notes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { bookSession } = createUseCases();
    const booked = await bookSession.execute({
      menteeId: session.user.id,
      mentorId: parsed.data.mentorId,
      teachingFieldId: parsed.data.teachingFieldId,
      title: parsed.data.title,
      description: parsed.data.description,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMinutes: parsed.data.durationMinutes,
      notes: parsed.data.notes,
    });

    return NextResponse.json(booked, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { getMentorSessions } = createUseCases();
    const sessions = await getMentorSessions.byMenteeId(session.user.id);

    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
