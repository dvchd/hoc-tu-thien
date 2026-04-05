import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { withAllowedMethods } from "@/lib/api-utils";

export const GET = withAllowedMethods(["GET"], async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { getMentorPublicProfile } = createUseCases();
    const profile = await getMentorPublicProfile.execute(params.id);

    return NextResponse.json(profile);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    const status =
      msg.includes("không tìm thấy") || msg.includes("chưa thiết lập")
        ? 404
        : 400;
    return NextResponse.json({ error: msg }, { status });
  }
});
