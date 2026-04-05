import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { UserRole } from "@/domain/value-objects/UserRole";
import { withAllowedMethods } from "@/lib/api-utils";

export const GET = withAllowedMethods(["GET"], async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

    const { listMentorApplications } = createUseCases();
    const result = await listMentorApplications.execute({ status, page, pageSize });

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
