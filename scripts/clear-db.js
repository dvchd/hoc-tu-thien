#!/usr/bin/env node

/**
 * scripts/clear-db.js
 * Xóa toàn bộ dữ liệu trong database, đúng thứ tự FK (con trước, cha sau).
 * Dùng cho development/testing — KHÔNG dùng cho production!
 *
 * Thứ tự xóa (từ bảng con → bảng cha):
 *   1. PaymentVerificationLog (depends on Payment)
 *   2. Report (depends on User, LearningSession)
 *   3. Payment (depends on User, LearningSession)
 *   4. MentorTeachingField (depends on MentorProfile, TeachingField)
 *   5. AvailabilitySlot (depends on MentorProfile)
 *   6. LearningSession (depends on User)
 *   7. MentorApplication (depends on User)
 *   8. UserAuditLog (depends on User, onDelete: Cascade)
 *   9. MenteeProfile (depends on User, onDelete: Cascade)
 *   10. MentorProfile (depends on User, onDelete: Cascade)
 *   11. Session (depends on User, onDelete: Cascade)
 *   12. Account (depends on User, onDelete: Cascade)
 *   13. VerificationToken (không có FK)
 *   14. SystemConfig (không có FK)
 *   15. CharityAccount (không có FK)
 *   16. TeachingField (không có FK)
 *   17. User (bảng gốc)
 */

const { PrismaClient } = require("@prisma/client");

async function clearDatabase() {
  const p = new PrismaClient();

  try {
    console.log("🔄 Đang xóa toàn bộ dữ liệu database...");

    // Bảng con — phải xóa trước
    const results = {};

    results.paymentVerificationLogs = await p.paymentVerificationLog.deleteMany();
    console.log(`  ✅ PaymentVerificationLog: ${results.paymentVerificationLogs.count} rows`);

    results.reports = await p.report.deleteMany();
    console.log(`  ✅ Report: ${results.reports.count} rows`);

    results.payments = await p.payment.deleteMany();
    console.log(`  ✅ Payment: ${results.payments.count} rows`);

    results.mentorTeachingFields = await p.mentorTeachingField.deleteMany();
    console.log(`  ✅ MentorTeachingField: ${results.mentorTeachingFields.count} rows`);

    results.availabilitySlots = await p.availabilitySlot.deleteMany();
    console.log(`  ✅ AvailabilitySlot: ${results.availabilitySlots.count} rows`);

    results.learningSessions = await p.learningSession.deleteMany();
    console.log(`  ✅ LearningSession: ${results.learningSessions.count} rows`);

    results.mentorApplications = await p.mentorApplication.deleteMany();
    console.log(`  ✅ MentorApplication: ${results.mentorApplications.count} rows`);

    results.userAuditLogs = await p.userAuditLog.deleteMany();
    console.log(`  ✅ UserAuditLog: ${results.userAuditLogs.count} rows`);

    results.menteeProfiles = await p.menteeProfile.deleteMany();
    console.log(`  ✅ MenteeProfile: ${results.menteeProfiles.count} rows`);

    results.mentorProfiles = await p.mentorProfile.deleteMany();
    console.log(`  ✅ MentorProfile: ${results.mentorProfiles.count} rows`);

    results.sessions = await p.session.deleteMany();
    console.log(`  ✅ Session: ${results.sessions.count} rows`);

    results.accounts = await p.account.deleteMany();
    console.log(`  ✅ Account: ${results.accounts.count} rows`);

    // Bảng độc lập
    results.verificationTokens = await p.verificationToken.deleteMany();
    console.log(`  ✅ VerificationToken: ${results.verificationTokens.count} rows`);

    results.systemConfigs = await p.systemConfig.deleteMany();
    console.log(`  ✅ SystemConfig: ${results.systemConfigs.count} rows`);

    results.charityAccounts = await p.charityAccount.deleteMany();
    console.log(`  ✅ CharityAccount: ${results.charityAccounts.count} rows`);

    results.teachingFields = await p.teachingField.deleteMany();
    console.log(`  ✅ TeachingField: ${results.teachingFields.count} rows`);

    // Bảng gốc — xóa cuối cùng
    results.users = await p.user.deleteMany();
    console.log(`  ✅ User: ${results.users.count} rows`);

    console.log("\n🎉 Đã xóa toàn bộ dữ liệu thành công!");
  } catch (error) {
    console.error("❌ Lỗi khi xóa dữ liệu:", error.message);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
}

clearDatabase();
