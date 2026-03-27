import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRole } from "@/domain/value-objects/UserRole";
import { createUseCases } from "@/lib/container";
import { z } from "zod";

const schema = z.object({
  headline: z.string().max(200).optional(),
  expertise: z.string().max(2000).optional(),
  experience: z.number().int().min(0).max(50).optional(),
  hourlyRate: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
  charityAccountId: z.string().optional().nullable(),
  onlyActivatedMentee: z.boolean().optional(),
  tnAccountNo: z.string().max(10).optional(),
  tnAccountName: z.string().max(100).optional(),
  tnCampaignKeyword: z.string().max(200).optional(),
  fieldIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== UserRole.MENTOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { uow } = createUseCases();
    const profile = await uow.mentorProfiles.findByUserId(session.user.id);
    return NextResponse.json(profile ?? null);
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== UserRole.MENTOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { fieldIds, ...profileData } = parsed.data;
    const { updateMentorProfile, setTeachingFields } = createUseCases();

    // Cập nhật profile qua use case (có validation BR08)
    const result = await updateMentorProfile.execute({
      userId: session.user.id,
      ...profileData,
      updatedBy: session.user.id,
    });

    // Cập nhật teaching fields nếu có
    if (fieldIds !== undefined) {
      await setTeachingFields.execute({
        userId: session.user.id,
        fieldIds,
        updatedBy: session.user.id,
      });
    }

    return NextResponse.json({ success: true, profileId: result.profileId, created: result.created });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
