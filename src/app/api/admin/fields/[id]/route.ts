import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRole } from "@/domain/value-objects/UserRole";
import { prisma } from "@/infrastructure/database/prisma/client";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const updated = await prisma.teachingField.update({
      where: { id: params.id },
      data: { ...parsed.data, updatedAt: new Date() },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/admin/fields/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Check if any mentor is using this field
    const count = await prisma.mentorTeachingField.count({ where: { teachingFieldId: params.id } });
    if (count > 0) {
      return NextResponse.json({ error: "Không thể xoá - đang có Mentor dùng lĩnh vực này" }, { status: 409 });
    }

    await prisma.teachingField.update({
      where: { id: params.id },
      data: { isDeleted: true, updatedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/fields/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
