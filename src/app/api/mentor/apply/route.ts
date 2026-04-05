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
  { message: "Phải nhập ít nhất Facebook hoặc Zalo để Admin có thể liên hệ" },
);

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listMentorApplications } = createUseCases();
    const applications = await listMentorApplications.execute({
      page: 1,
      pageSize: 1,
    });

    // Find the user's own application
    const myApplication = applications.applications.find(
      (a) => a.userId === session.user!.id
    );

    if (!myApplication) {
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json(myApplication);
  } catch (error) {
    console.error("[API] GET /api/mentor/apply:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
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
        { error: "Dữ liệu không hợp lệ", details: parsed.error.flatten(), message: "Vui lòng kiểm tra lại thông tin (động lực ≥ 50 ký tự, kinh nghiệm ≥ 20 ký tự, ít nhất Facebook hoặc Zalo)" },
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
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    console.error("[API] POST /api/mentor/apply:", error);
    return NextResponse.json({ error: msg, message: msg }, { status: 400 });
  }
}
