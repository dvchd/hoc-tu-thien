import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRole } from "@/domain/value-objects/UserRole";
import { createUseCases } from "@/lib/container";
import { z } from "zod";

const changeRoleSchema = z.object({
  userId: z.string().min(1),
  newRole: z.enum([UserRole.MENTOR, UserRole.MENTEE]),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = changeRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { changeUserRole } = createUseCases();
    const updated = await changeUserRole.execute({
      userId: parsed.data.userId,
      newRole: parsed.data.newRole,
      performedBy: session.user.id,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API] change role error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
