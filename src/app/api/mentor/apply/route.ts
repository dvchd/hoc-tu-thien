import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { z } from "zod";

const schema = z.object({
  motivation: z.string().min(50).max(2000),
  experience: z.string().min(20).max(2000),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { applyForMentor } = createUseCases();
    const result = await applyForMentor.execute({
      userId: session.user.id,
      motivation: parsed.data.motivation,
      experience: parsed.data.experience,
      linkedinUrl: parsed.data.linkedinUrl || undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
