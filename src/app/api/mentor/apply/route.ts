import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { z } from "zod";

const schema = z.object({
  motivation: z.string().min(50).max(2000),
  experience: z.string().min(20).max(2000),
  facebook: z.string().optional(),
  zalo: z.string().optional(),
}).refine(
  (data) => data.facebook?.trim() || data.zalo?.trim(),
  { message: "Phu1ea3i nhu1eadp u00edt nhu1ea5t Facebook hou1eb7c Zalo u0111u1ec3 Admin cu00f3 thu1ec3 liu00ean hu1ec7" },
);

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // BUG-C1 fix: du00f9ng findByUserId tru1ef1c tiu1ebfp thay vu00ec scan tou00e0n bu1ed9 vu1edbi pageSize:1
    // Cu00e1ch cu0169 du00f9ng listMentorApplications({ page:1, pageSize:1 }) ru1ed3i find() su1ebd khu00f4ng bao giu1edd
    // tu00ecm thu1ea5y u0111u01a1n cu1ee7a user nu1ebfu nu00f3 khu00f4ng phu1ea3i bu1ea3n ghi u0111u1ea7u tiu00ean trong hu1ec7 thu1ed1ng.
    const { uow } = createUseCases();
    const myApplication = await uow.mentorApplications.findByUserId(session.user.id);

    return NextResponse.json(myApplication ?? null);
  } catch (error) {
    console.error("[API] GET /api/mentor/apply:", error);
    return NextResponse.json({ error: "Lu1ed7i hu1ec7 thu1ed1ng" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Du1eef liu1ec7u khu00f4ng hu1ee3p lu1ec7",
          details: parsed.error.flatten(),
          message: "Vui lu00f2ng kiu1ec3m tra lu1ea1i thu00f4ng tin (u0111u1ed9ng lu1ef1c u2265 50 ku00fd tu1ef1, kinh nghiu1ec7m u2265 20 ku00fd tu1ef1, u00edt nhu1ea5t Facebook hou1eb7c Zalo)",
        },
        { status: 400 }
      );
    }

    const { submitMentorApplication } = createUseCases();
    const result = await submitMentorApplication.execute({
      userId: session.user.id,
      motivation: parsed.data.motivation,
      experience: parsed.data.experience,
      contactInfo: {
        facebook: parsed.data.facebook?.trim() || undefined,
        zalo: parsed.data.zalo?.trim() || undefined,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lu1ed7i hu1ec7 thu1ed1ng";
    console.error("[API] POST /api/mentor/apply:", error);
    return NextResponse.json({ error: msg, message: msg }, { status: 400 });
  }
}
