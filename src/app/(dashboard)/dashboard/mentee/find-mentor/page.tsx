import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { prisma } from "@/infrastructure/database/prisma/client";
import { FindMentorClient } from "@/presentation/components/mentee/FindMentorClient";

export default async function FindMentorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.status !== UserStatus.ACTIVE) redirect("/activation");

  // Load mentors with profiles
  const mentors = await prisma.user.findMany({
    where: { role: "MENTOR", status: "ACTIVE", isDeleted: false },
    include: {
      mentorProfile: {
        include: {
          teachingFields: { include: { teachingField: true } },
          availabilitySlots: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const allFields = await prisma.teachingField.findMany({
    where: { isActive: true, isDeleted: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const serialized = mentors.map((m) => ({
    id: m.id,
    name: m.name,
    image: m.image,
    bio: m.bio,
    profile: m.mentorProfile
      ? {
          headline: m.mentorProfile.headline,
          expertise: m.mentorProfile.expertise,
          experience: m.mentorProfile.experience,
          hourlyRate: m.mentorProfile.hourlyRate,
          isAvailable: m.mentorProfile.isAvailable,
          rating: m.mentorProfile.rating,
          ratingCount: m.mentorProfile.ratingCount,
          totalSessions: m.mentorProfile.totalSessions,
          tnAccountNo: m.mentorProfile.tnAccountNo,
          fields: m.mentorProfile.teachingFields.map((tf) => ({
            id: tf.teachingField.id,
            name: tf.teachingField.name,
            icon: tf.teachingField.icon,
          })),
          slots: m.mentorProfile.availabilitySlots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div className="animate-in">
        <p className="text-jade-600 text-sm font-medium tracking-wide uppercase mb-1">
          Người học
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900">
          Tìm Mentor
        </h1>
        <p className="text-stone-500 mt-1">
          Khám phá Mentor phù hợp và đặt lịch học ngay.
        </p>
      </div>

      <FindMentorClient
        mentors={serialized}
        allFields={allFields}
        currentUserId={session.user.id}
      />
    </div>
  );
}
