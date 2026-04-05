import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { UserRole } from "@/domain/value-objects/UserRole";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  accountNo: z.string().min(1).max(20),
  bankName: z.string().optional(),
  campaignKeyword: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const { listCharityAccounts } = createUseCases();
    const accounts = await listCharityAccounts.execute({
      isActive: isActive !== null ? isActive === "true" : undefined,
      includeDeleted,
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { createCharityAccount } = createUseCases();
    const account = await createCharityAccount.execute({
      ...parsed.data,
      adminId: session.user.id,
    });

    return NextResponse.json({ success: true, account }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
