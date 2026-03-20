import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRole } from "@/domain/value-objects/UserRole";
import { prisma } from "@/infrastructure/database/prisma/client";
import { z } from "zod";

const slotSchema = z.object({
  slots: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== UserRole.MENTOR && session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = slotSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const profile = await prisma.mentorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "Mentor profile not found" }, { status: 404 });

  // Replace all slots
  await prisma.availabilitySlot.deleteMany({ where: { mentorProfileId: profile.id } });
  if (parsed.data.slots.length > 0) {
    await prisma.availabilitySlot.createMany({
      data: parsed.data.slots.map((s, i) => ({
        id: `slot_${Date.now()}_${i}`,
        mentorProfileId: profile.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isRecurring: true,
      })),
    });
  }

  return NextResponse.json({ success: true });
}
