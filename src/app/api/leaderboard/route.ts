import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : undefined;
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : undefined;

    const { getLeaderboard } = createUseCases();
    const board = await getLeaderboard.execute(month, year);

    return NextResponse.json(board);
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
