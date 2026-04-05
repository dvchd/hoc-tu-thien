import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRole } from "@/domain/value-objects/UserRole";
import { createUseCases } from "@/lib/container";
import { z } from "zod";
import { withAllowedMethods } from "@/lib/api-utils";

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

  try {
    const { setAvailabilitySlots } = createUseCases();
    await setAvailabilitySlots.execute({
      userId: session.user.id,
      slots: parsed.data.slots,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
