import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRole } from "@/domain/value-objects/UserRole";
import { prisma } from "@/lib/prisma";
import { withAllowedMethods } from "@/lib/api-utils";

export const GET = withAllowedMethods(["GET"], async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

     const sessions = await prisma.learningSession.findMany({
       orderBy: [{ createdAt: "desc" }],
       include: {
         mentor: { select: { id: true, name: true } },
         mentee: { select: { id: true, name: true } },
       },
       take: 50,
     });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("GET /api/admin/sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
