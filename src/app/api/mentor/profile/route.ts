import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRole } from "@/domain/value-objects/UserRole";
import { prisma } from "@/infrastructure/database/prisma/client";
import { z } from "zod";

const schema = z.object({
  headline: z.string().max(200).optional(),
  expertise: z.string().max(2000).optional(),
  experience: z.number().int().min(0).max(50).optional(),
  hourlyRate: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
  tnAccountNo: z.string().max(4).optional(),
  tnAccountName: z.string().max(100).optional(),
  tnCampaignKeyword: z.string().max(200).optional(),
  fieldIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== UserRole.MENTOR && session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { fieldIds, ...profileData } = parsed.data;
  const profile = await prisma.mentorProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...profileData, createdBy: session.user.id, updatedBy: session.user.id, version: 1 },
    update: { ...profileData, updatedBy: session.user.id, updatedAt: new Date(), version: { increment: 1 } },
  });
  if (fieldIds !== undefined) {
    await prisma.mentorTeachingField.deleteMany({ where: { mentorProfileId: profile.id } });
    if (fieldIds.length > 0) {
      await prisma.mentorTeachingField.createMany({
        data: fieldIds.map((id, i) => ({ id: `mtf_${Date.now()}_${i}`, mentorProfileId: profile.id, teachingFieldId: id })),
      });
    }
  }
  return NextResponse.json({ success: true, profileId: profile.id });
}
