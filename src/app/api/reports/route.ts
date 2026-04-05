import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { z } from "zod";
import { withAllowedMethods } from "@/lib/api-utils";

const schema = z.object({
  reportedUserId: z.string().cuid(),
  sessionId: z.string().cuid().optional(),
  reason: z.enum(["INAPPROPRIATE", "MISCONDUCT", "NO_SHOW_DISPUTE", "OTHER"]),
  description: z.string().min(20).max(2000),
});

export const POST = withAllowedMethods(["POST"], async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { submitReport } = createUseCases();
    const report = await submitReport.execute({
      reporterId: session.user.id,
      ...parsed.data,
    });

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
