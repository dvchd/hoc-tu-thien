import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * E2E Global Teardown
 * Chạy một lần sau toàn bộ test suite.
 * Xóa toàn bộ dữ liệu test đã tạo.
 */
export default async function globalTeardown() {
  console.log("\n[E2E Teardown] Cleaning up test data...");

  // Xóa theo thứ tự FK
  await prisma.paymentVerificationLog.deleteMany({
    where: { payment: { userId: { startsWith: "e2e_" } } },
  });
  await prisma.payment.deleteMany({ where: { userId: { startsWith: "e2e_" } } });
  await prisma.learningSession.deleteMany({
    where: {
      OR: [
        { menteeId: { startsWith: "e2e_" } },
        { mentorId: { startsWith: "e2e_" } },
      ],
    },
  });
  await prisma.mentorApplication.deleteMany({
    where: { userId: { startsWith: "e2e_" } },
  });
  await prisma.mentorProfile.deleteMany({
    where: { userId: { startsWith: "e2e_" } },
  });
  await prisma.userAuditLog.deleteMany({
    where: { userId: { startsWith: "e2e_" } },
  });
  await prisma.user.deleteMany({ where: { id: { startsWith: "e2e_" } } });

  console.log("[E2E Teardown] Done.");
  await prisma.$disconnect();
}
