import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { withAllowedMethods } from "@/lib/api-utils";

export const GET = withAllowedMethods(["GET"], async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uow } = createUseCases();
    const fields = await uow.teachingFields.findAll();
    return NextResponse.json(fields);
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
});
