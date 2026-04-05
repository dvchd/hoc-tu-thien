import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRole } from "@/domain/value-objects/UserRole";
import { prisma } from "@/infrastructure/database/prisma/client";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  isActive: z.boolean().default(true),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const slug = slugify(parsed.data.name);
  const maxSort = await prisma.teachingField.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

  try {
    const field = await prisma.teachingField.create({
      data: {
        id: `tf_${Date.now()}`,
        name: parsed.data.name,
        slug,
        description: parsed.data.description ?? null,
        icon: parsed.data.icon ?? "📚",
        isActive: parsed.data.isActive,
        sortOrder,
      },
    });
    return NextResponse.json(field, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Tên lĩnh vực đã tồn tại" }, { status: 409 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const fields = await prisma.teachingField.findMany({
    where: { isDeleted: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(fields);
}
