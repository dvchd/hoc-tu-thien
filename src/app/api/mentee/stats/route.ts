import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { getMenteeLearningStats } = createUseCases();
    const stats = await getMenteeLearningStats.execute(session.user.id);

    return NextResponse.json(stats);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
