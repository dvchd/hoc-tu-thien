import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { UserRole } from "@/domain/value-objects/UserRole";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  bankName: z.string().optional(),
  campaignKeyword: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { updateCharityAccount } = createUseCases();
    const account = await updateCharityAccount.execute(params.id, parsed.data, session.user.id);

    return NextResponse.json({ success: true, account });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { deleteCharityAccount } = createUseCases();
    await deleteCharityAccount.execute(params.id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
