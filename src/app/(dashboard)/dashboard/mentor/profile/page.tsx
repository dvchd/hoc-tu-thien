import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/domain/value-objects/UserRole";
import { prisma } from "@/infrastructure/database/prisma/client";
import { MentorProfileForm } from "@/presentation/components/mentor/MentorProfileForm";
import { AvailabilityManager } from "@/presentation/components/mentor/AvailabilityManager";

export default async function MentorProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== UserRole.MENTOR && session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const [mentorProfile, allFields] = await Promise.all([
    prisma.mentorProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        teachingFields: { include: { teachingField: true } },
        availabilitySlots: true,
      },
    }),
    prisma.teachingField.findMany({
      where: { isActive: true, isDeleted: false },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const selectedFieldIds =
    mentorProfile?.teachingFields.map((tf: { teachingFieldId: string }) => tf.teachingFieldId) ?? [];

  return (
    <div className="max-w-3xl space-y-8">
      <div className="animate-in">
        <p className="text-amber-600 text-sm font-medium tracking-wide uppercase mb-1">
          Mentor
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Hồ sơ Mentor
        </h1>
        <p className="text-stone-500 mt-1">
          Cập nhật thông tin, lĩnh vực giảng dạy và tài khoản Thiện Nguyện App.
        </p>
      </div>

      <MentorProfileForm
        userId={session.user.id}
        userName={session.user.name}
        userImage={session.user.image}
        profile={mentorProfile}
        allFields={allFields}
        selectedFieldIds={selectedFieldIds}
      />

      <AvailabilityManager
        userId={session.user.id}
        slots={mentorProfile?.availabilitySlots ?? []}
        mentorProfileId={mentorProfile?.id ?? null}
      />
    </div>
  );
}
