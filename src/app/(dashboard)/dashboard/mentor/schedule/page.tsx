import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { prisma } from "@/infrastructure/database/prisma/client";
import { AvailabilityManager } from "@/presentation/components/mentor/AvailabilityManager";

export default async function MentorSchedulePage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("[MentorSchedulePage] auth() error (stale cookie):", error);
    redirect("/login?error=SessionExpired");
  }
  if (!session?.user) redirect("/login");
  if (session.user.role !== UserRole.MENTOR && session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const mentorProfile = await prisma.mentorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      availabilitySlots: {
        orderBy: { dayOfWeek: "asc" },
      },
    },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
          Mentor
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Lịch trống hàng tuần
        </h1>
        <p className="text-stone-500 mt-1">
          Quản lý khung giờ rảnh để Mentee có thể đặt lịch học. Lịch sẽ lặp lại mỗi tuần.
        </p>
      </div>

      <AvailabilityManager
        userId={session.user.id}
        mentorProfileId={mentorProfile?.id ?? null}
        slots={mentorProfile?.availabilitySlots ?? []}
      />
    </div>
  );
}
