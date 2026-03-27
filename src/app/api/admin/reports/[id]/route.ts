import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { UserRole } from "@/domain/value-objects/UserRole";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["REVIEWED", "RESOLVED", "DISMISSED"]),
  reviewNote: z.string().min(1).max(1000),
});

export async function PATCH(
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

    const { resolveReport } = createUseCases();
    const report = await resolveReport.execute(
      params.id,
      parsed.data.status,
      session.user.id,
      parsed.data.reviewNote
    );

    return NextResponse.json({ success: true, report });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
