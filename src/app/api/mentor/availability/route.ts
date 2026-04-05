import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRole } from "@/domain/value-objects/UserRole";
import { prisma } from "@/infrastructure/database/prisma/client";
import { z } from "zod";
import { withAllowedMethods } from "@/lib/api-utils";
import { createId } from "@paralleldrive/cuid2";

/** Convert "HH:MM" to minutes since midnight */
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Check if [aStart, aEnd) overlaps [bStart, bEnd). Touching boundaries OK. */
function isOverlapping(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = toMinutes(aStart), ae = toMinutes(aEnd);
  const bs = toMinutes(bStart), be = toMinutes(bEnd);
  return as < be && bs < ae;
}

const slotItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const slotSchema = z.object({
  slots: z.array(slotItemSchema),
});

export const POST = withAllowedMethods(["POST"], async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== UserRole.MENTOR && session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = slotSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { slots } = parsed.data;

  // Server-side validation
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const startMin = toMinutes(s.startTime);
    const endMin = toMinutes(s.endTime);

    // 1. Start must be before end
    if (startMin >= endMin) {
      return NextResponse.json(
        { error: `Khung giờ #${i + 1} (${DAYS[s.dayOfWeek]}): Giờ bắt đầu phải trước giờ kết thúc.` },
        { status: 400 },
      );
    }

    // 2. Minimum 30 minutes
    if (endMin - startMin < 30) {
      return NextResponse.json(
        { error: `Khung giờ #${i + 1} (${DAYS[s.dayOfWeek]}): Mỗi khung giờ phải ít nhất 30 phút.` },
        { status: 400 },
      );
    }

    // 3. Time range: 07:00 – 21:00
    if (startMin < 7 * 60 || endMin > 21 * 60) {
      return NextResponse.json(
        { error: `Khung giờ #${i + 1} (${DAYS[s.dayOfWeek]}): Giờ phải trong khoảng 07:00 – 21:00.` },
        { status: 400 },
      );
    }
  }

  // 4. Check overlap between slots on the same day
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i], b = slots[j];
      if (a.dayOfWeek === b.dayOfWeek && isOverlapping(a.startTime, a.endTime, b.startTime, b.endTime)) {
        return NextResponse.json(
          {
            error: `${DAYS[a.dayOfWeek]}: Khung giờ ${a.startTime}–${a.endTime} và ${b.startTime}–${b.endTime} bị trùng nhau.`,
          },
          { status: 400 },
        );
      }
    }
  }

  // 5. Maximum 20 slots per week to prevent abuse
  if (slots.length > 20) {
    return NextResponse.json(
      { error: "Tối đa 20 khung giờ mỗi tuần." },
      { status: 400 },
    );
  }

  const profile = await prisma.mentorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "Mentor profile not found" }, { status: 404 });

  // Replace all slots atomically within a transaction
  await prisma.$transaction([
    prisma.availabilitySlot.deleteMany({ where: { mentorProfileId: profile.id } }),
    ...(slots.length > 0
      ? [
          prisma.availabilitySlot.createMany({
            data: slots.map((s) => ({
              id: createId(),
              mentorProfileId: profile.id,
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              isRecurring: true,
            })),
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ success: true });
});

const DAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
