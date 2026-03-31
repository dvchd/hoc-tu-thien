import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { UserRole } from "@/domain/value-objects/UserRole";
import { z } from "zod";
import { withAllowedMethods } from "@/lib/api-utils";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().max(1000).optional(),
});

export const PATCH = withAllowedMethods(["PATCH"], async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { approveMentorApplication, rejectMentorApplication } = createUseCases();
    const adminId = session.user.id;

    let result;
    if (parsed.data.action === "approve") {
      result = await approveMentorApplication.execute(params.id, adminId, parsed.data.reviewNote);
    } else {
      if (!parsed.data.reviewNote) {
        return NextResponse.json({ error: "Vui lòng nhập lý do từ chối" }, { status: 400 });
      }
      result = await rejectMentorApplication.execute(params.id, adminId, parsed.data.reviewNote);
    }

    return NextResponse.json({ success: true, application: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
