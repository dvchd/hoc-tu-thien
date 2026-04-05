import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * E2E Global Setup
 * Chạy một lần trước toàn bộ test suite.
 * Seed các user cố định để các test có thể dùng lại mà không conflict.
 */
export default async function globalSetup() {
  console.log("\n[E2E Setup] Seeding test users...");

  const users = [
    {
      id: "e2e_pending_mentee",
      email: "e2e_pending@test.com",
      name: "E2E Pending Mentee",
      role: "MENTEE" as const,
      status: "PENDING_ACTIVATION" as const,
      version: 1,
    },
    {
      id: "e2e_active_mentee",
      email: "e2e_active@test.com",
      name: "E2E Active Mentee",
      role: "MENTEE" as const,
      status: "ACTIVE" as const,
      version: 1,
    },
    {
      id: "e2e_mentor",
      email: "e2e_mentor@test.com",
      name: "E2E Test Mentor",
      role: "MENTOR" as const,
      status: "ACTIVE" as const,
      version: 1,
    },
    {
      id: "e2e_admin",
      email: "e2e_admin@test.com",
      name: "E2E Admin User",
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
      version: 1,
    },
    {
      id: "e2e_apply_mentee",
      email: "e2e_apply@test.com",
      name: "E2E Apply Mentee",
      role: "MENTEE" as const,
      status: "ACTIVE" as const,
      version: 1,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { role: u.role, status: u.status, version: u.version },
      create: u,
    });
  }

  // Tạo MentorProfile cho e2e_mentor
  await prisma.mentorProfile.upsert({
    where: { userId: "e2e_mentor" },
    update: { headline: "E2E Test Mentor Profile", isAvailable: true },
    create: {
      id: "e2e_mentor_profile",
      userId: "e2e_mentor",
      headline: "E2E Test Mentor Profile",
      expertise: "Đây là tài khoản test tự động",
      hourlyRate: 0,
      isAvailable: true,
      onlyActivatedMentee: false,
    },
  });

  // Xóa sessions cũ từ lần chạy trước để tránh conflict
  await prisma.learningSession.deleteMany({
    where: {
      OR: [
        { menteeId: { startsWith: "e2e_" } },
        { mentorId: { startsWith: "e2e_" } },
      ],
    },
  });

  // Xóa payments cũ
  await prisma.payment.deleteMany({
    where: { userId: { startsWith: "e2e_" } },
  });

  // Xóa mentor applications cũ
  await prisma.mentorApplication.deleteMany({
    where: { userId: { startsWith: "e2e_" } },
  });

  console.log("[E2E Setup] Done. Test users ready.");
  await prisma.$disconnect();
}
