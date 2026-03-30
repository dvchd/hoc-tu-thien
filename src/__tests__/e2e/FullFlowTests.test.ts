/**
 * Full E2E Flow Tests – Mentor, Mentee, Admin
 *
 * Mỗi scenario test 1 luồng hoàn chỉnh (end-to-end) của từng role,
 * bao gồm tất cả các bước chính mà user thực hiện trong hệ thống.
 *
 * Scenarios:
 * 1. Mentee complete flow: Đăng ký → Kích hoạt → Đặt lịch → Thanh toán → Đánh giá → Xem stats → Báo cáo
 * 2. Mentor complete flow: Nộp đơn → Được duyệt → Thiết lập hồ sơ → Xác nhận buổi học → Hoàn thành → Đánh dấu vắng → Xem stats
 * 3. Admin complete flow: Quản lý users → Duyệt đơn mentor → Quản lý charity accounts → Teaching fields → System config → Xử lý reports → Leaderboard
 * 4. Cross-role interaction: Mentee đặt → Mentor xác nhận → Hoàn thành → Thanh toán → Đánh giá → Báo cáo → Admin xử lý
 */

import {
  FindOrCreateUserUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  ChangeUserRoleUseCase,
  UpdateUserProfileUseCase,
  SoftDeleteUserUseCase,
} from "@/application/use-cases/user/UserUseCases";
import {
  InitiateActivationUseCase,
  VerifyPaymentUseCase,
  InitiateSessionFeePaymentUseCase,
} from "@/application/use-cases/payment/PaymentUseCases";
import {
  BookSessionUseCase,
  ConfirmSessionUseCase,
  CancelSessionUseCase,
  CompleteSessionUseCase,
  ConfirmCompletionUseCase,
  MarkNoShowUseCase,
  RateSessionUseCase,
  GetLeaderboardUseCase,
  GetMentorSessionsUseCase,
} from "@/application/use-cases/session/SessionUseCases";
import {
  SubmitMentorApplicationUseCase,
  ListMentorApplicationsUseCase,
  ApproveMentorApplicationUseCase,
  RejectMentorApplicationUseCase,
} from "@/application/use-cases/mentor/MentorApplicationUseCases";
import {
  UpdateMentorProfileUseCase,
  SetTeachingFieldsUseCase,
  GetMentorPublicProfileUseCase,
} from "@/application/use-cases/mentor/MentorProfileUseCases";
import {
  CreateCharityAccountUseCase,
  ListCharityAccountsUseCase,
  UpdateCharityAccountUseCase,
  DeleteCharityAccountUseCase,
} from "@/application/use-cases/admin/CharityAccountUseCases";
import {
  GetSystemConfigUseCase,
  UpdateSystemConfigUseCase,
} from "@/application/use-cases/admin/SystemConfigUseCases";
import {
  SubmitReportUseCase,
  ListReportsUseCase,
  ResolveReportUseCase,
} from "@/application/use-cases/report/ReportUseCases";
import {
  GetMenteeLearningStatsUseCase,
  GetMentorTeachingStatsUseCase,
} from "@/application/use-cases/stats/StatsUseCases";
import {
  PaymentStatus,
  PaymentType,
  SessionStatus,
  ACTIVATION_AMOUNT,
} from "@/domain/value-objects/Payment";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { SYSTEM_CONFIG_KEYS } from "@/domain/repositories/ISystemConfigRepository";
import {
  buildUser,
  buildAdmin,
  buildMentor,
  buildMentee,
  buildPaymentRecord,
  buildSessionRecord,
  createMockUnitOfWork,
  nextTopOfHour,
} from "@/__tests__/helpers";

// ─── Mock external services ───────────────────────────────────────────────────

jest.mock("@/infrastructure/external/ThienNguyenAppClient", () => ({
  tnAppClient: { findTransactionByCode: jest.fn() },
}));

jest.mock("@/infrastructure/external/GoogleMeetService", () => ({
  meetService: {
    createMeetLink: jest.fn().mockResolvedValue({
      meetLink: "https://meet.google.com/full-flow-test",
      meetId: "full-flow-test",
    }),
  },
}));

import { tnAppClient } from "@/infrastructure/external/ThienNguyenAppClient";
const mockTnClient = tnAppClient as jest.Mocked<typeof tnAppClient>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Tạo SessionRecord đầy đủ với tất cả các trường bắt buộc */
function buildFullSessionRecord(
  overrides: Partial<{
    id: string;
    menteeId: string;
    mentorId: string;
    teachingFieldId: string | null;
    title: string;
    description: string | null;
    status: SessionStatus;
    scheduledAt: Date;
    durationMinutes: number;
    endAt: Date | null;
    meetLink: string | null;
    meetId: string | null;
    fee: number;
    notes: string | null;
    mentorNotes: string | null;
    rating: number | null;
    ratingComment: string | null;
    mentorConfirmed: boolean;
    menteeConfirmed: boolean;
    isLateCancellation: boolean;
    isNoShow: boolean;
    noShowMarkedBy: string | null;
    cancelReason: string | null;
    cancelledBy: string | null;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    version: number;
  }> = {}
) {
  return {
    id: "sess_full_001",
    menteeId: "mentee_001",
    mentorId: "mentor_001",
    teachingFieldId: null,
    title: "Buổi học test",
    description: null,
    status: SessionStatus.PENDING,
    scheduledAt: nextTopOfHour(86400000),
    durationMinutes: 60,
    endAt: null,
    meetLink: null,
    meetId: null,
    fee: 0,
    notes: null,
    mentorNotes: null,
    rating: null,
    ratingComment: null,
    mentorConfirmed: false,
    menteeConfirmed: false,
    isLateCancellation: false,
    isNoShow: false,
    noShowMarkedBy: null,
    cancelReason: null,
    cancelledBy: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 1: MENTEE COMPLETE FLOW
// Đăng ký → Kích hoạt → Đặt buổi học miễn phí → Đặt buổi có phí →
// Thanh toán → Đánh giá → Xem stats → Nộp báo cáo
// ═══════════════════════════════════════════════════════════════════════════════

describe("Scenario 1 – Mentee Complete Flow", () => {
  const uow = createMockUnitOfWork();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Step 1: Đăng ký tài khoản mới qua Google OAuth", async () => {
    const newUser = buildUser({
      id: "mentee_full_001",
      email: "linh.mentee@gmail.com",
      name: "Linh Nguyễn",
      status: UserStatus.PENDING_ACTIVATION,
    });

    uow.users.findByEmail.mockResolvedValue(null);
    uow.users.save.mockResolvedValue(newUser);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const findOrCreate = new FindOrCreateUserUseCase(uow);
    const userDTO = await findOrCreate.execute({
      id: "mentee_full_001",
      email: "linh.mentee@gmail.com",
      name: "Linh Nguyễn",
    });

    expect(userDTO.role).toBe(UserRole.MENTEE);
    expect(userDTO.status).toBe(UserStatus.PENDING_ACTIVATION);
    expect(userDTO.email).toBe("linh.mentee@gmail.com");
    expect(uow.users.save).toHaveBeenCalledTimes(1);
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CREATE" })
    );
  });

  it("Step 2: Kích hoạt tài khoản bằng chuyển khoản thiện nguyện", async () => {
    const pendingUser = buildUser({
      id: "mentee_full_001",
      email: "linh.mentee@gmail.com",
      status: UserStatus.PENDING_ACTIVATION,
    });

    const paymentRecord = buildPaymentRecord({
      id: "pay_activation_001",
      userId: "mentee_full_001",
      type: PaymentType.ACTIVATION,
      amount: ACTIVATION_AMOUNT,
      shortCode: "LINHACT1",
      transactionCode: "HOCTUTHIEN KICHHOAT LINHACT1",
    });

    // 2a: Khởi tạo thanh toán kích hoạt
    uow.users.findById.mockResolvedValue(pendingUser);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.payments.create.mockResolvedValue(paymentRecord);
    uow.systemConfig.get.mockResolvedValue(null);
    uow.charityAccounts.findDefault.mockResolvedValue({
      id: "charity_full_001",
      name: "Quỹ Học Từ Thiện",
      accountNo: "123456789",
      accountName: "Quy Hoc Tu Thien",
      bankName: "MB Bank",
      isActive: true,
      isDefault: true,
    });
    uow.systemConfig.getNumber.mockResolvedValue(24);

    const initiateActivation = new InitiateActivationUseCase(uow);
    const activationInfo = await initiateActivation.execute({ userId: "mentee_full_001" });

    expect(activationInfo.amount).toBe(ACTIVATION_AMOUNT);
    expect(activationInfo.transactionCode).toContain("KICHHOAT");
    expect(activationInfo.qrImageUrl).toContain("vietqr.io");

    // 2b: Xác nhận thanh toán qua TN App
    uow.payments.findById.mockResolvedValue({
      ...paymentRecord,
      status: PaymentStatus.PENDING,
    });
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);
    uow.payments.updateStatus.mockResolvedValue({
      ...paymentRecord,
      status: PaymentStatus.VERIFIED,
    } as any);
    uow.users.findById
      .mockResolvedValueOnce(pendingUser)   // in verifyPayment
      .mockResolvedValueOnce(pendingUser);  // in activateUser
    uow.users.update.mockResolvedValue(pendingUser.activate("system"));

    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: true,
      transaction: {
        id: "tn_act_001",
        refId: "FT_ACT_001",
        transactionTime: "2025-06-01T10:00:00",
        type: "CREDIT",
        transactionAmount: ACTIVATION_AMOUNT,
        otherAccountDisplayName: "LINH NGUYEN",
        otherAccountName: "LINH NGUYEN",
        narrative: "HOCTUTHIEN KICHHOAT LINHACT1",
        incognito: false,
      },
      rawResponse: "{}",
    });

    const verifyPayment = new VerifyPaymentUseCase(uow);
    const result = await verifyPayment.execute({
      paymentId: "pay_activation_001",
      triggeredBy: "mentee_full_001",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Kích hoạt tài khoản thành công");
    expect(uow.users.update).toHaveBeenCalled();
  });

  it("Step 3: Cập nhật hồ sơ cá nhân", async () => {
    const activeUser = buildUser({
      id: "mentee_full_001",
      email: "linh.mentee@gmail.com",
      status: UserStatus.ACTIVE,
    });

    const updatedUser = activeUser.updateProfile(
      { name: "Linh Nguyễn", bio: "Sinh viên CNTT năm 3", phone: "0901234567" },
      "mentee_full_001"
    );

    uow.users.findById.mockResolvedValue(activeUser);
    uow.users.update.mockResolvedValue(updatedUser);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const updateProfile = new UpdateUserProfileUseCase(uow);
    const profileDTO = await updateProfile.execute({
      userId: "mentee_full_001",
      name: "Linh Nguyễn",
      bio: "Sinh viên CNTT năm 3",
      phone: "0901234567",
      updatedBy: "mentee_full_001",
    });

    expect(profileDTO.name).toBe("Linh Nguyễn");
    expect(profileDTO.bio).toBe("Sinh viên CNTT năm 3");
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PROFILE_UPDATE" })
    );
  });

  it("Step 4: Đặt buổi học miễn phí (free session) – không cần kích hoạt", async () => {
    const mentee = buildUser({
      id: "mentee_full_001",
      status: UserStatus.ACTIVE,
      role: UserRole.MENTEE,
    });
    const mentor = buildMentor();

    const freeSession = buildFullSessionRecord({
      id: "sess_free_001",
      menteeId: "mentee_full_001",
      mentorId: mentor.id,
      title: "Tư vấn định hướng nghề nghiệp",
      status: SessionStatus.PENDING,
      fee: 0,
    });

    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(mentor);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(null);
    uow.sessions.getMentorProfileFee.mockResolvedValue({ hourlyRate: 0, tnAccountNo: null, tnAccountName: null, tnCampaignKeyword: null, charityAccountId: null });
    uow.systemConfig.getNumber
      .mockResolvedValueOnce(2)   // MIN_BOOKING_ADVANCE_HOURS
      .mockResolvedValueOnce(5);  // MAX_ACTIVE_BOOKINGS
    uow.sessions.countActiveByMenteeId.mockResolvedValue(0);
    uow.sessions.findConflictingSession.mockResolvedValue(null);
    uow.sessions.create.mockResolvedValue(freeSession);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const bookSession = new BookSessionUseCase(uow);
    const booked = await bookSession.execute({
      menteeId: "mentee_full_001",
      mentorId: mentor.id,
      title: "Tư vấn định hướng nghề nghiệp",
      scheduledAt: nextTopOfHour(86400000),
    });

    expect(booked.status).toBe(SessionStatus.PENDING);
    expect(booked.fee).toBe(0);
    expect(booked.menteeId).toBe("mentee_full_001");
  });

  it("Step 5: Đặt buổi học có phí (paid session)", async () => {
    const mentee = buildUser({
      id: "mentee_full_001",
      status: UserStatus.ACTIVE,
      role: UserRole.MENTEE,
    });
    const mentor = buildMentor();

    const paidSession = buildFullSessionRecord({
      id: "sess_paid_001",
      menteeId: "mentee_full_001",
      mentorId: mentor.id,
      title: "Học NodeJS nâng cao",
      status: SessionStatus.PENDING,
      fee: 200000,
    });

    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(mentor);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(null);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 200000,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: "charity_001",
    });
    uow.systemConfig.getNumber
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5);
    uow.sessions.countActiveByMenteeId.mockResolvedValue(1); // 1 active session (from step 4)
    uow.sessions.findConflictingSession.mockResolvedValue(null);
    uow.sessions.create.mockResolvedValue(paidSession);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const bookSession = new BookSessionUseCase(uow);
    const booked = await bookSession.execute({
      menteeId: "mentee_full_001",
      mentorId: mentor.id,
      title: "Học NodeJS nâng cao",
      scheduledAt: nextTopOfHour(172800000),
    });

    expect(booked.status).toBe(SessionStatus.PENDING);
    expect(booked.fee).toBe(200000);
  });

  it("Step 6: Buổi học có phí hoàn thành → trạng thái PAYMENT_PENDING → Thanh toán", async () => {
    // 6a: Mentor đã xác nhận buổi học
    const confirmedSession = buildFullSessionRecord({
      id: "sess_paid_001",
      menteeId: "mentee_full_001",
      mentorId: "mentor_001",
      status: SessionStatus.CONFIRMED,
      fee: 200000,
      meetLink: "https://meet.google.com/full-flow-test",
    });

    // 6b: Mentor hoàn thành → PAYMENT_PENDING
    const paymentPendingSession = {
      ...confirmedSession,
      status: SessionStatus.PAYMENT_PENDING,
      endAt: new Date(),
    };

    uow.sessions.findById.mockResolvedValue(confirmedSession);
    uow.sessions.updateStatus.mockResolvedValue(paymentPendingSession as any);

    const completeSession = new CompleteSessionUseCase(uow);
    const completed = await completeSession.execute("sess_paid_001", "mentor_001");

    expect(completed.status).toBe(SessionStatus.PAYMENT_PENDING);

    // 6c: Mentee khởi tạo thanh toán học phí
    const sessionPayment = buildPaymentRecord({
      id: "pay_session_001",
      userId: "mentee_full_001",
      sessionId: "sess_paid_001",
      type: PaymentType.SESSION_FEE,
      amount: 200000,
      shortCode: "SESSFEE1",
      transactionCode: "HOCTUTHIEN HOCPHI SESSFEE1",
    });

    uow.sessions.findById.mockResolvedValue(paymentPendingSession as any);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 200000,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: "charity_001",
    });
    uow.charityAccounts.findById.mockResolvedValue({
      id: "charity_001",
      name: "Quỹ Từ Thiện ABC",
      accountNo: "123456789",
      bankName: "Vietcombank",
      campaignKeyword: null,
      description: "Quỹ thiện nguyện",
      isActive: true,
      isDefault: false,
      usageCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "admin_001",
      isDeleted: false,
      deletedAt: null,
    });
    uow.systemConfig.getNumber.mockResolvedValue(24);
    uow.payments.create.mockResolvedValue(sessionPayment);

    const initSessionPayment = new InitiateSessionFeePaymentUseCase(uow);
    const paymentInfo = await initSessionPayment.execute("sess_paid_001", "mentee_full_001");

    expect(paymentInfo.amount).toBe(200000);
    expect(paymentInfo.transactionCode).toContain("HOCPHI");

    // 6d: Xác nhận thanh toán
    uow.payments.findById.mockResolvedValue({
      ...sessionPayment,
      status: PaymentStatus.PENDING,
    });

    const completedSession = {
      ...paymentPendingSession,
      status: SessionStatus.COMPLETED,
    };

    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);
    uow.payments.updateStatus.mockResolvedValue({
      ...sessionPayment,
      status: PaymentStatus.VERIFIED,
    } as any);
    uow.sessions.findById.mockResolvedValue(paymentPendingSession as any);
    uow.sessions.updateStatus.mockResolvedValue(completedSession as any);
    uow.mentorProfiles.incrementTotalSessions.mockResolvedValue(undefined);

    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: true,
      transaction: {
        id: "tn_sess_001",
        refId: "FT_SESS_001",
        transactionTime: "2025-06-15T14:00:00",
        type: "CREDIT",
        transactionAmount: 200000,
        otherAccountDisplayName: "LINH NGUYEN",
        otherAccountName: "LINH NGUYEN",
        narrative: "HOCTUTHIEN HOCPHI SESSFEE1",
        incognito: false,
      },
      rawResponse: "{}",
    });

    const verifyPayment = new VerifyPaymentUseCase(uow);
    const verifyResult = await verifyPayment.execute({
      paymentId: "pay_session_001",
      triggeredBy: "mentee_full_001",
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.message).toContain("Thanh toán học phí thành công");
    expect(uow.mentorProfiles.incrementTotalSessions).toHaveBeenCalledWith("mentor_001");
  });

  it("Step 7: Đánh giá buổi học hoàn thành", async () => {
    const completedSession = buildFullSessionRecord({
      id: "sess_paid_001",
      menteeId: "mentee_full_001",
      mentorId: "mentor_001",
      status: SessionStatus.COMPLETED,
      fee: 200000,
      rating: null,
    });

    const ratedSession = {
      ...completedSession,
      rating: 5,
      ratingComment: "Mentor rất tận tâm, giải thích dễ hiểu!",
    };

    uow.sessions.findById.mockResolvedValue(completedSession);
    uow.sessions.addRating.mockResolvedValue(ratedSession as any);
    uow.mentorProfiles.updateRatingStats.mockResolvedValue(undefined);

    const rateSession = new RateSessionUseCase(uow);
    const result = await rateSession.execute(
      "sess_paid_001",
      "mentee_full_001",
      5,
      "Mentor rất tận tâm, giải thích dễ hiểu!"
    );

    expect(result.rating).toBe(5);
    expect(result.ratingComment).toBe("Mentor rất tận tâm, giải thích dễ hiểu!");
    expect(uow.mentorProfiles.updateRatingStats).toHaveBeenCalledWith("mentor_001", 5);
  });

  it("Step 8: Xem thống kê học tập (learning stats)", async () => {
    const mentee = buildUser({
      id: "mentee_full_001",
      status: UserStatus.ACTIVE,
    });

    uow.users.findById.mockResolvedValue(mentee);
    uow.sessions.getMenteeStats.mockResolvedValue({
      totalSessions: 3,
      totalHours: 4.5,
      totalDonated: 200000,
      avgRatingGiven: 4.7,
      noShowCount: 0,
      lateCancellationCount: 0,
    });

    const getStats = new GetMenteeLearningStatsUseCase(uow);
    const stats = await getStats.execute("mentee_full_001");

    expect(stats.totalSessions).toBe(3);
    expect(stats.totalHours).toBe(4.5);
    expect(stats.totalDonated).toBe(200000);
    expect(stats.avgRatingGiven).toBe(4.7);
    expect(stats.noShowCount).toBe(0);
  });

  it("Step 9: Nộp báo cáo vi phạm", async () => {
    const mentee = buildUser({ id: "mentee_full_001", status: UserStatus.ACTIVE });
    const reportedMentor = buildMentor();

    const completedSession = buildFullSessionRecord({
      id: "sess_free_001",
      menteeId: "mentee_full_001",
      mentorId: reportedMentor.id,
      status: SessionStatus.COMPLETED,
    });

    const reportRecord = {
      id: "report_001",
      reporterId: "mentee_full_001",
      reportedUserId: reportedMentor.id,
      sessionId: "sess_free_001",
      reason: "Nội dung không phù hợp",
      description: "Mentor dạy sai kiến thức cơ bản và có thái độ thiếu chuyên nghiệp trong buổi học",
      status: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date(),
    };

    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(reportedMentor);
    uow.sessions.findById.mockResolvedValue(completedSession);
    uow.reports.create.mockResolvedValue(reportRecord);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const submitReport = new SubmitReportUseCase(uow);
    const report = await submitReport.execute({
      reporterId: "mentee_full_001",
      reportedUserId: reportedMentor.id,
      sessionId: "sess_free_001",
      reason: "Nội dung không phù hợp",
      description: "Mentor dạy sai kiến thức cơ bản và có thái độ thiếu chuyên nghiệp trong buổi học",
    });

    expect(report.status).toBe("PENDING");
    expect(report.reason).toBe("Nội dung không phù hợp");
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REPORT_SUBMITTED" })
    );
  });

  it("Step 10: Huỷ buổi học – trường hợp bình thường", async () => {
    const pendingSession = buildFullSessionRecord({
      id: "sess_cancel_001",
      menteeId: "mentee_full_001",
      mentorId: "mentor_001",
      status: SessionStatus.PENDING,
      scheduledAt: new Date(Date.now() + 86400000 * 3), // 3 ngày sau
    });

    const cancelledSession = {
      ...pendingSession,
      status: SessionStatus.CANCELLED,
      cancelReason: "Bận việc đột xuất",
      cancelledBy: "mentee_full_001",
      isLateCancellation: false,
    };

    uow.sessions.findById.mockResolvedValue(pendingSession);
    uow.systemConfig.getNumber.mockResolvedValue(120); // 120 phút
    uow.sessions.updateStatus.mockResolvedValue(cancelledSession as any);

    const cancelSession = new CancelSessionUseCase(uow);
    const result = await cancelSession.execute(
      "sess_cancel_001",
      "mentee_full_001",
      "Bận việc đột xuất"
    );

    expect(result.status).toBe(SessionStatus.CANCELLED);
    expect(result.isLateCancellation).toBe(false);
  });

  it("Step 11: Không thể đặt buổi học khi còn buổi chưa thanh toán (BR09)", async () => {
    const mentee = buildUser({
      id: "mentee_full_001",
      status: UserStatus.ACTIVE,
      role: UserRole.MENTEE,
    });
    const mentor = buildMentor();

    const pendingPaymentSession = buildFullSessionRecord({
      id: "sess_unpaid",
      menteeId: "mentee_full_001",
      mentorId: "mentor_001",
      status: SessionStatus.PAYMENT_PENDING,
      fee: 200000,
    });

    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(mentor);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(pendingPaymentSession as any);

    const bookSession = new BookSessionUseCase(uow);
    await expect(
      bookSession.execute({
        menteeId: "mentee_full_001",
        mentorId: mentor.id,
        title: "Buổi học mới",
        scheduledAt: new Date(Date.now() + 86400000),
      })
    ).rejects.toThrow("còn buổi học chưa thanh toán");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 2: MENTOR COMPLETE FLOW
// Nộp đơn → Được duyệt → Thiết lập hồ sơ → Set teaching fields →
// Xác nhận buổi học → Hoàn thành → Đánh dấu vắng mặt → Xem stats
// ═══════════════════════════════════════════════════════════════════════════════

describe("Scenario 2 – Mentor Complete Flow", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Step 1: Mentee nộp đơn đăng ký làm Mentor", async () => {
    const uow = createMockUnitOfWork();
    const activeMentee = buildUser({
      id: "future_mentor_001",
      email: "tuan@gmail.com",
      name: "Tuấn Trần",
      status: UserStatus.ACTIVE,
      role: UserRole.MENTEE,
    });

    const applicationRecord = {
      id: "app_001",
      userId: "future_mentor_001",
      motivation: "Tôi muốn chia sẻ kiến thức lập trình web",
      experience: "5 năm kinh nghiệm phát triển web",
      linkedinUrl: "https://linkedin.com/in/tuan-tran",
      contactInfo: JSON.stringify({ zalo: "0901234567" }),
      status: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    uow.users.findById.mockResolvedValue(activeMentee);
    uow.mentorApplications.findByUserId.mockResolvedValue(null);
    uow.mentorApplications.create.mockResolvedValue(applicationRecord);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const submitApp = new SubmitMentorApplicationUseCase(uow);
    const result = await submitApp.execute({
      userId: "future_mentor_001",
      motivation: "Tôi muốn chia sẻ kiến thức lập trình web",
      experience: "5 năm kinh nghiệm phát triển web",
      linkedinUrl: "https://linkedin.com/in/tuan-tran",
      contactInfo: { zalo: "0901234567" },
    });

    expect(result.status).toBe("PENDING");
    expect(result.motivation).toContain("chia sẻ kiến thức");
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MENTOR_APPLICATION_SUBMITTED" })
    );
  });

  it("Step 1b: Không thể nộp đơn nếu chưa kích hoạt tài khoản", async () => {
    const uow = createMockUnitOfWork();
    const pendingUser = buildUser({
      id: "inactive_user",
      status: UserStatus.PENDING_ACTIVATION,
      role: UserRole.MENTEE,
    });

    uow.users.findById.mockResolvedValue(pendingUser);

    const submitApp = new SubmitMentorApplicationUseCase(uow);
    await expect(
      submitApp.execute({
        userId: "inactive_user",
        motivation: "Muốn làm mentor",
        experience: "3 năm",
      })
    ).rejects.toThrow("Tài khoản chưa được kích hoạt");
  });

  it("Step 1c: Không thể nộp đơn nếu đã có đơn pending", async () => {
    const uow = createMockUnitOfWork();
    const activeMentee = buildUser({
      id: "future_mentor_001",
      status: UserStatus.ACTIVE,
      role: UserRole.MENTEE,
    });

    uow.users.findById.mockResolvedValue(activeMentee);
    uow.mentorApplications.findByUserId.mockResolvedValue({
      id: "app_existing",
      userId: "future_mentor_001",
      motivation: "Cũ",
      experience: "Cũ",
      linkedinUrl: null,
      contactInfo: null,
      status: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    const submitApp = new SubmitMentorApplicationUseCase(uow);
    await expect(
      submitApp.execute({
        userId: "future_mentor_001",
        motivation: "Nộp lại",
        experience: "5 năm",
      })
    ).rejects.toThrow("đang chờ xét duyệt");
  });

  it("Step 2: Admin duyệt đơn → User trở thành Mentor + tạo MentorProfile", async () => {
    const uow = createMockUnitOfWork();
    const applicationRecord = {
      id: "app_001",
      userId: "future_mentor_001",
      motivation: "Chia sẻ kiến thức",
      experience: "5 năm",
      linkedinUrl: null,
      contactInfo: null,
      status: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    const approvedApplication = {
      ...applicationRecord,
      status: "APPROVED",
      reviewedBy: "admin_001",
      reviewedAt: new Date(),
      reviewNote: "Kinh nghiệm tốt, đáp ứng yêu cầu",
    };

    const user = buildUser({
      id: "future_mentor_001",
      status: UserStatus.ACTIVE,
      role: UserRole.MENTEE,
    });
    const promotedUser = user.promoteToMentor("admin_001");

    const mentorProfile = {
      id: "profile_001",
      userId: "future_mentor_001",
      bio: null,
      experience: null,
      headline: null,
      hourlyRate: 0,
      charityAccountId: null,
      onlyActivatedMentee: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { name: "Tuấn Trần", email: "tuan@gmail.com", image: null },
    };

    uow.mentorApplications.findById.mockResolvedValue(applicationRecord);
    uow.mentorApplications.updateStatus.mockResolvedValue(approvedApplication);
    uow.users.findById.mockResolvedValue(user);
    uow.users.update.mockResolvedValue(promotedUser);
    uow.mentorProfiles.findByUserId.mockResolvedValue(null);
    uow.mentorProfiles.create.mockResolvedValue(mentorProfile as any);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const approveApp = new ApproveMentorApplicationUseCase(uow);
    const result = await approveApp.execute("app_001", "admin_001", "Kinh nghiệm tốt");

    expect(result.status).toBe("APPROVED");
    expect(result.mentorProfile).toBeDefined();
    expect(result.mentorProfile.userId).toBe("future_mentor_001");
    expect(uow.users.update).toHaveBeenCalled();
    expect(uow.mentorProfiles.create).toHaveBeenCalled();
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MENTOR_APPLICATION_APPROVED" })
    );
  });

  it("Step 2b: Admin từ chối đơn đăng ký", async () => {
    const uow = createMockUnitOfWork();
    const pendingApplication = {
      id: "app_reject_001",
      userId: "rejected_user",
      motivation: "Muốn thử",
      experience: "Chưa có",
      linkedinUrl: null,
      contactInfo: null,
      status: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    const rejectedApplication = {
      ...pendingApplication,
      status: "REJECTED",
      reviewedBy: "admin_001",
      reviewNote: "Kinh nghiệm chưa đủ, vui lòng bổ sung thêm",
    };

    uow.mentorApplications.findById.mockResolvedValue(pendingApplication);
    uow.mentorApplications.updateStatus.mockResolvedValue(rejectedApplication);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const rejectApp = new RejectMentorApplicationUseCase(uow);
    const result = await rejectApp.execute(
      "app_reject_001",
      "admin_001",
      "Kinh nghiệm chưa đủ, vui lòng bổ sung thêm"
    );

    expect(result.status).toBe("REJECTED");
    expect(result.reviewNote).toContain("Kinh nghiệm chưa đủ");
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MENTOR_APPLICATION_REJECTED" })
    );
  });

  it("Step 2c: Không thể từ chối nếu thiếu lý do", async () => {
    const uow = createMockUnitOfWork();

    const rejectApp = new RejectMentorApplicationUseCase(uow);
    await expect(
      rejectApp.execute("app_001", "admin_001", "")
    ).rejects.toThrow("Vui lòng nhập lý do từ chối");
  });

  it("Step 3: Mentor thiết lập hồ sơ (profile)", async () => {
    const uow = createMockUnitOfWork();
    const mentor = buildUser({
      id: "future_mentor_001",
      role: UserRole.MENTOR,
      status: UserStatus.ACTIVE,
    });

    uow.users.findById.mockResolvedValue(mentor);
    uow.charityAccounts.findById.mockResolvedValue({
      id: "charity_001",
      name: "Quỹ Từ Thiện ABC",
      accountNo: "123456789",
      bankName: "Vietcombank",
      campaignKeyword: null,
      description: null,
      isActive: true,
      isDefault: true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "admin_001",
      isDeleted: false,
      deletedAt: null,
    });
    uow.mentorProfiles.findByUserId.mockResolvedValue(null);
    uow.mentorProfiles.create.mockResolvedValue({
      id: "profile_001",
      userId: "future_mentor_001",
      bio: "Chuyên gia NodeJS với 5 năm kinh nghiệm",
      experience: "5",
      headline: "Senior Backend Developer",
      hourlyRate: 150000,
      charityAccountId: "charity_001",
      onlyActivatedMentee: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { name: "Tuấn Trần", email: null, image: null },
    } as any);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const updateProfile = new UpdateMentorProfileUseCase(uow);
    const result = await updateProfile.execute({
      userId: "future_mentor_001",
      headline: "Senior Backend Developer",
      expertise: "Chuyên gia NodeJS với 5 năm kinh nghiệm",
      experience: 5,
      hourlyRate: 150000,
      charityAccountId: "charity_001",
      onlyActivatedMentee: true,
    });

    expect(result.profileId).toBe("profile_001");
    expect(result.created).toBe(true);
    expect(uow.mentorProfiles.create).toHaveBeenCalled();
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MENTOR_PROFILE_CREATED" })
    );
  });

  it("Step 3b: Cập nhật hồ sơ mentor hiện có", async () => {
    const uow = createMockUnitOfWork();
    const mentor = buildUser({
      id: "future_mentor_001",
      role: UserRole.MENTOR,
      status: UserStatus.ACTIVE,
    });

    const existingProfile = {
      id: "profile_001",
      userId: "future_mentor_001",
      bio: "Cũ",
      experience: "3",
      headline: "Developer",
      hourlyRate: 100000,
      charityAccountId: null,
      onlyActivatedMentee: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { name: "Tuấn Trần", email: null, image: null },
    };

    uow.users.findById.mockResolvedValue(mentor);
    uow.mentorProfiles.findByUserId.mockResolvedValue(existingProfile as any);
    uow.mentorProfiles.update.mockResolvedValue({
      ...existingProfile,
      headline: "Lead Backend Developer",
      hourlyRate: 200000,
    } as any);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const updateProfile = new UpdateMentorProfileUseCase(uow);
    const result = await updateProfile.execute({
      userId: "future_mentor_001",
      headline: "Lead Backend Developer",
      hourlyRate: 200000,
    });

    expect(result.profileId).toBe("profile_001");
    expect(result.created).toBe(false);
    expect(uow.mentorProfiles.update).toHaveBeenCalledWith(
      "profile_001",
      expect.objectContaining({ headline: "Lead Backend Developer", hourlyRate: 200000 })
    );
  });

  it("Step 4: Mentor thiết lập môn dạy (teaching fields)", async () => {
    const uow = createMockUnitOfWork();
    const mentor = buildUser({
      id: "future_mentor_001",
      role: UserRole.MENTOR,
      status: UserStatus.ACTIVE,
    });

    const profile = {
      id: "profile_001",
      userId: "future_mentor_001",
      bio: null,
      headline: null,
      experience: null,
      hourlyRate: 0,
      charityAccountId: null,
      onlyActivatedMentee: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { name: "Tuấn", email: null, image: null },
    };

    uow.users.findById.mockResolvedValue(mentor);
    uow.mentorProfiles.findByUserId.mockResolvedValue(profile as any);
    uow.teachingFields.findById
      .mockResolvedValueOnce({
        id: "field_nodejs",
        name: "NodeJS",
        slug: "nodejs",
        description: null,
        icon: null,
        isActive: true,
        sortOrder: 1,
      })
      .mockResolvedValueOnce({
        id: "field_react",
        name: "ReactJS",
        slug: "reactjs",
        description: null,
        icon: null,
        isActive: true,
        sortOrder: 2,
      });
    uow.teachingFields.setMentorFields.mockResolvedValue(undefined);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const setFields = new SetTeachingFieldsUseCase(uow);
    await setFields.execute({
      userId: "future_mentor_001",
      fieldIds: ["field_nodejs", "field_react"],
    });

    expect(uow.teachingFields.setMentorFields).toHaveBeenCalledWith(
      "profile_001",
      ["field_nodejs", "field_react"]
    );
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MENTOR_TEACHING_FIELDS_UPDATED" })
    );
  });

  it("Step 5: Mentor xác nhận buổi học (Confirm Session)", async () => {
    const uow = createMockUnitOfWork();
    const pendingSession = buildFullSessionRecord({
      id: "sess_confirm_001",
      menteeId: "mentee_full_001",
      mentorId: "future_mentor_001",
      status: SessionStatus.PENDING,
    });

    const confirmedSession = {
      ...pendingSession,
      status: SessionStatus.CONFIRMED,
      meetLink: "https://meet.google.com/abc-defg-hij",
      meetId: "abc-defg-hij",
    };

    uow.sessions.findById.mockResolvedValue(pendingSession);
    uow.sessions.updateStatus.mockResolvedValue(confirmedSession as any);

    const confirmSession = new ConfirmSessionUseCase(uow);
    const result = await confirmSession.execute(
      "sess_confirm_001",
      "future_mentor_001",
      "https://meet.google.com/abc-defg-hij"
    );

    expect(result.status).toBe(SessionStatus.CONFIRMED);
    expect(result.meetLink).toContain("meet.google.com");
  });

  it("Step 5b: Mentor không thể xác nhận buổi học của người khác", async () => {
    const uow = createMockUnitOfWork();
    const session = buildFullSessionRecord({
      id: "sess_other",
      mentorId: "other_mentor",
      status: SessionStatus.PENDING,
    });

    uow.sessions.findById.mockResolvedValue(session);

    const confirmSession = new ConfirmSessionUseCase(uow);
    await expect(
      confirmSession.execute("sess_other", "future_mentor_001")
    ).rejects.toThrow("không có quyền xác nhận");
  });

  it("Step 6: Mentor hoàn thành buổi học miễn phí → COMPLETED trực tiếp", async () => {
    const uow = createMockUnitOfWork();
    const confirmedFree = buildFullSessionRecord({
      id: "sess_free_complete",
      mentorId: "future_mentor_001",
      menteeId: "mentee_full_001",
      status: SessionStatus.CONFIRMED,
      fee: 0,
    });

    const completedSession = {
      ...confirmedFree,
      status: SessionStatus.COMPLETED,
    };

    uow.sessions.findById.mockResolvedValue(confirmedFree);
    uow.sessions.updateStatus.mockResolvedValue(completedSession as any);
    uow.mentorProfiles.incrementTotalSessions.mockResolvedValue(undefined);

    const complete = new CompleteSessionUseCase(uow);
    const result = await complete.execute("sess_free_complete", "future_mentor_001");

    expect(result.status).toBe(SessionStatus.COMPLETED);
    expect(uow.mentorProfiles.incrementTotalSessions).toHaveBeenCalledWith("future_mentor_001");
  });

  it("Step 7: Mentor đánh dấu vắng mặt (No-Show) cho mentee", async () => {
    const uow = createMockUnitOfWork();
    const pastTime = new Date(Date.now() - 3600000); // 1 giờ trước
    const confirmedSession = buildFullSessionRecord({
      id: "sess_noshow_001",
      mentorId: "future_mentor_001",
      menteeId: "mentee_noshow",
      status: SessionStatus.CONFIRMED,
      fee: 0,
      scheduledAt: pastTime,
    });

    const noShowSession = {
      ...confirmedSession,
      status: SessionStatus.NO_SHOW,
      isNoShow: true,
      noShowMarkedBy: "future_mentor_001",
    };

    uow.sessions.findById.mockResolvedValue(confirmedSession);
    uow.sessions.updateStatus.mockResolvedValue(noShowSession as any);
    uow.users.incrementNoShow.mockResolvedValue(undefined);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const markNoShow = new MarkNoShowUseCase(uow);
    const result = await markNoShow.execute("sess_noshow_001", "future_mentor_001");

    expect(result.status).toBe(SessionStatus.NO_SHOW);
    expect(result.isNoShow).toBe(true);
    expect(uow.users.incrementNoShow).toHaveBeenCalledWith("mentee_noshow");
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SESSION_NO_SHOW_MARKED" })
    );
  });

  it("Step 7b: Không thể đánh dấu vắng mặt khi chưa đến giờ", async () => {
    const uow = createMockUnitOfWork();
    const futureSession = buildFullSessionRecord({
      id: "sess_future",
      mentorId: "future_mentor_001",
      status: SessionStatus.CONFIRMED,
      scheduledAt: new Date(Date.now() + 86400000), // ngày mai
    });

    uow.sessions.findById.mockResolvedValue(futureSession);

    const markNoShow = new MarkNoShowUseCase(uow);
    await expect(
      markNoShow.execute("sess_future", "future_mentor_001")
    ).rejects.toThrow("Chưa đến giờ buổi học");
  });

  it("Step 8: Mentor xem thống kê giảng dạy (teaching stats)", async () => {
    const uow = createMockUnitOfWork();
    const mentor = buildUser({
      id: "future_mentor_001",
      role: UserRole.MENTOR,
      status: UserStatus.ACTIVE,
    });

    uow.users.findById.mockResolvedValue(mentor);
    uow.sessions.getMentorStats.mockResolvedValue({
      totalSessions: 20,
      totalMentees: 8,
      totalDonations: 3000000,
      totalHours: 30,
      avgRating: 4.8,
      ratingCount: 15,
      lateCancellationCount: 1,
    });

    const getStats = new GetMentorTeachingStatsUseCase(uow);
    const stats = await getStats.execute("future_mentor_001");

    expect(stats.totalSessions).toBe(20);
    expect(stats.totalMentees).toBe(8);
    expect(stats.totalDonations).toBe(3000000);
    expect(stats.avgRating).toBe(4.8);
    expect(stats.ratingCount).toBe(15);
  });

  it("Step 9: Xem hồ sơ công khai của Mentor", async () => {
    const uow = createMockUnitOfWork();
    const mentor = buildUser({
      id: "future_mentor_001",
      name: "Tuấn Trần",
      email: "tuan@gmail.com",
      role: UserRole.MENTOR,
      status: UserStatus.ACTIVE,
    });

    const mentorProfile = {
      id: "profile_001",
      userId: "future_mentor_001",
      bio: "Chuyên gia NodeJS",
      experience: "5",
      headline: "Senior Backend Developer",
      hourlyRate: 150000,
      charityAccountId: "charity_001",
      onlyActivatedMentee: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { name: "Tuấn Trần", email: "tuan@gmail.com", image: null },
      charityAccount: {
        id: "charity_001",
        name: "Quỹ Từ Thiện ABC",
        accountNo: "123456789",
        bankName: "Vietcombank",
      },
      teachingFields: [
        { id: "mtf_1", field: { id: "field_nodejs", name: "NodeJS", icon: null } },
        { id: "mtf_2", field: { id: "field_react", name: "ReactJS", icon: null } },
      ],
      availabilitySlots: [
        { id: "slot_1", dayOfWeek: 1, startTime: "09:00", endTime: "12:00", isRecurring: true },
        { id: "slot_2", dayOfWeek: 3, startTime: "14:00", endTime: "17:00", isRecurring: true },
      ],
      totalSessions: 20,
      averageRating: 4.8,
      ratingCount: 15,
    };

    uow.users.findById.mockResolvedValue(mentor);
    uow.mentorProfiles.findByUserId.mockResolvedValue(mentorProfile as any);

    const getPublicProfile = new GetMentorPublicProfileUseCase(uow);
    const result = await getPublicProfile.execute("future_mentor_001");

    expect(result.user.name).toBe("Tuấn Trần");
    expect(result.profile.headline).toBe("Senior Backend Developer");
    expect(result.profile.hourlyRate).toBe(150000);
    expect(result.profile.rating).toBe(4.8);
    expect(result.profile.ratingCount).toBe(15);
    expect(result.profile.totalSessions).toBe(20);
    expect(result.profile.onlyActivatedMentee).toBe(true);
    expect(result.profile.charityAccount).toEqual({
      name: "Quỹ Từ Thiện ABC",
      accountNo: "123456789",
    });
    expect(result.teachingFields).toHaveLength(2);
    expect(result.teachingFields[0].name).toBe("NodeJS");
    expect(result.availabilitySlots).toHaveLength(2);
  });

  it("Step 10: Mentor xem danh sách buổi học của mình", async () => {
    const uow = createMockUnitOfWork();

    const sessions = [
      buildFullSessionRecord({ id: "s1", mentorId: "future_mentor_001", status: SessionStatus.COMPLETED }),
      buildFullSessionRecord({ id: "s2", mentorId: "future_mentor_001", status: SessionStatus.CONFIRMED }),
      buildFullSessionRecord({ id: "s3", mentorId: "future_mentor_001", status: SessionStatus.PENDING }),
    ];

    uow.sessions.findByMentorId.mockResolvedValue(sessions);

    const getMentorSessions = new GetMentorSessionsUseCase(uow);
    const result = await getMentorSessions.byMentorId("future_mentor_001");

    expect(result).toHaveLength(3);
    expect(uow.sessions.findByMentorId).toHaveBeenCalledWith("future_mentor_001");
  });

  it("Step 11: Mentor xác nhận hoàn thành buổi học (Confirm Completion)", async () => {
    const uow = createMockUnitOfWork();
    const confirmedSession = buildFullSessionRecord({
      id: "sess_cc_001",
      mentorId: "future_mentor_001",
      menteeId: "mentee_full_001",
      status: SessionStatus.CONFIRMED,
    });

    const confirmedByMentor = {
      ...confirmedSession,
      mentorConfirmed: true,
    };

    uow.sessions.findById.mockResolvedValue(confirmedSession);
    uow.sessions.updateConfirmation.mockResolvedValue(confirmedByMentor as any);

    const confirmCompletion = new ConfirmCompletionUseCase(uow);
    const result = await confirmCompletion.execute(
      "sess_cc_001",
      "future_mentor_001",
      "https://meet.google.com/xyz-abc-def"
    );

    expect(result.mentorConfirmed).toBe(true);
    expect(uow.sessions.updateConfirmation).toHaveBeenCalledWith(
      "sess_cc_001",
      "mentor",
      expect.objectContaining({ meetLink: "https://meet.google.com/xyz-abc-def" })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 3: ADMIN COMPLETE FLOW
// Quản lý users → Duyệt đơn → Charity accounts → Teaching fields →
// System config → Xử lý reports → Leaderboard
// ═══════════════════════════════════════════════════════════════════════════════

describe("Scenario 3 – Admin Complete Flow", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Step 1: Admin xem danh sách users", async () => {
    const uow = createMockUnitOfWork();
    const users = [
      buildUser({ id: "u1", role: UserRole.MENTEE }),
      buildUser({ id: "u2", role: UserRole.MENTOR }),
      buildUser({ id: "u3", role: UserRole.ADMIN }),
    ];

    uow.users.findAll.mockResolvedValue(users);
    uow.users.count.mockResolvedValue(3);

    const listUsers = new ListUsersUseCase(uow);
    const result = await listUsers.execute({ page: 1, pageSize: 10 });

    expect(result.users).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
  });

  it("Step 2: Admin thay đổi role user (promote mentee → mentor)", async () => {
    const uow = createMockUnitOfWork();
    const admin = buildAdmin();
    const mentee = buildUser({ id: "promote_target", role: UserRole.MENTEE });
    const promotedEntity = mentee.promoteToMentor(admin.id);

    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(admin);
    uow.users.update.mockResolvedValue(promotedEntity);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const changeRole = new ChangeUserRoleUseCase(uow);
    const result = await changeRole.execute({
      userId: "promote_target",
      newRole: UserRole.MENTOR,
      performedBy: admin.id,
    });

    expect(result.role).toBe(UserRole.MENTOR);
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ROLE_CHANGE" })
    );
  });

  it("Step 3: Admin soft-delete user", async () => {
    const uow = createMockUnitOfWork();
    const admin = buildAdmin();
    const targetUser = buildUser({ id: "delete_target" });

    uow.users.findById
      .mockResolvedValueOnce(targetUser)
      .mockResolvedValueOnce(admin);
    uow.users.softDelete.mockResolvedValue(undefined);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const softDelete = new SoftDeleteUserUseCase(uow);
    await softDelete.execute("delete_target", admin.id);

    expect(uow.users.softDelete).toHaveBeenCalledWith("delete_target", admin.id);
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SOFT_DELETE" })
    );
  });

  it("Step 3b: Non-admin không thể xóa user", async () => {
    const uow = createMockUnitOfWork();
    const regularUser = buildUser({ role: UserRole.MENTEE });
    const target = buildUser({ id: "target" });

    uow.users.findById
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce(regularUser);

    const softDelete = new SoftDeleteUserUseCase(uow);
    await expect(
      softDelete.execute("target", regularUser.id)
    ).rejects.toThrow("Only admins");
  });

  it("Step 4: Admin xem danh sách đơn đăng ký mentor", async () => {
    const uow = createMockUnitOfWork();
    const applications = {
      applications: [
        {
          id: "app_1",
          userId: "u1",
          motivation: "Muốn chia sẻ",
          experience: "3 năm",
          linkedinUrl: null,
          contactInfo: null,
          status: "PENDING",
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          user: { id: "u1", name: "User 1", email: "u1@test.com", image: null },
        },
      ],
      total: 1,
    };

    uow.mentorApplications.findAll.mockResolvedValue(applications);

    const listApps = new ListMentorApplicationsUseCase(uow);
    const result = await listApps.execute({ status: "PENDING" });

    expect(result.applications).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("Step 5: Admin tạo charity account", async () => {
    const uow = createMockUnitOfWork();
    const newAccount = {
      id: "charity_new_001",
      name: "Quỹ Hy Vọng",
      accountNo: "9876543210",
      bankName: "Techcombank",
      campaignKeyword: "HYVONG",
      description: "Quỹ từ thiện Hy Vọng",
      isActive: true,
      isDefault: true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "admin_001",
      isDeleted: false,
      deletedAt: null,
    };

    uow.charityAccounts.findByAccountNo.mockResolvedValue(null);
    uow.charityAccounts.clearDefault.mockResolvedValue(undefined);
    uow.charityAccounts.create.mockResolvedValue(newAccount);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const createAccount = new CreateCharityAccountUseCase(uow);
    const result = await createAccount.execute({
      name: "Quỹ Hy Vọng",
      accountNo: "9876543210",
      bankName: "Techcombank",
      campaignKeyword: "HYVONG",
      description: "Quỹ từ thiện Hy Vọng",
      isDefault: true,
      adminId: "admin_001",
    });

    expect(result.name).toBe("Quỹ Hy Vọng");
    expect(result.isDefault).toBe(true);
    expect(uow.charityAccounts.clearDefault).toHaveBeenCalled();
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHARITY_ACCOUNT_CREATED" })
    );
  });

  it("Step 5b: Không thể tạo charity account trùng số tài khoản", async () => {
    const uow = createMockUnitOfWork();
    uow.charityAccounts.findByAccountNo.mockResolvedValue({
      id: "existing",
      name: "Quỹ cũ",
      accountNo: "9876543210",
    } as any);

    const createAccount = new CreateCharityAccountUseCase(uow);
    await expect(
      createAccount.execute({
        name: "Quỹ mới",
        accountNo: "9876543210",
        adminId: "admin_001",
      })
    ).rejects.toThrow("đã tồn tại");
  });

  it("Step 5c: Admin cập nhật charity account", async () => {
    const uow = createMockUnitOfWork();
    const existingAccount = {
      id: "charity_001",
      name: "Quỹ Hy Vọng",
      accountNo: "9876543210",
      bankName: "Techcombank",
      campaignKeyword: null,
      description: null,
      isActive: true,
      isDefault: false,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "admin_001",
      isDeleted: false,
      deletedAt: null,
    };

    const updatedAccount = {
      ...existingAccount,
      name: "Quỹ Hy Vọng - Cập nhật",
      isDefault: true,
    };

    uow.charityAccounts.findById.mockResolvedValue(existingAccount);
    uow.charityAccounts.clearDefault.mockResolvedValue(undefined);
    uow.charityAccounts.update.mockResolvedValue(updatedAccount);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const updateAccount = new UpdateCharityAccountUseCase(uow);
    const result = await updateAccount.execute(
      "charity_001",
      { name: "Quỹ Hy Vọng - Cập nhật", isDefault: true },
      "admin_001"
    );

    expect(result.name).toBe("Quỹ Hy Vọng - Cập nhật");
    expect(result.isDefault).toBe(true);
    expect(uow.charityAccounts.clearDefault).toHaveBeenCalled();
  });

  it("Step 5d: Admin xóa charity account (không đang dùng)", async () => {
    const uow = createMockUnitOfWork();
    const account = {
      id: "charity_unused",
      name: "Quỹ Cũ",
      accountNo: "111222333",
      bankName: "VCB",
      campaignKeyword: null,
      description: null,
      isActive: false,
      isDefault: false,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "admin_001",
      isDeleted: false,
      deletedAt: null,
    };

    uow.charityAccounts.findById.mockResolvedValue(account);
    uow.charityAccounts.getUsageCount.mockResolvedValue(0);
    uow.charityAccounts.delete.mockResolvedValue(undefined);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const deleteAccount = new DeleteCharityAccountUseCase(uow);
    await deleteAccount.execute("charity_unused", "admin_001");

    expect(uow.charityAccounts.delete).toHaveBeenCalledWith("charity_unused");
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHARITY_ACCOUNT_DELETED" })
    );
  });

  it("Step 5e: Không thể xóa charity account đang được sử dụng", async () => {
    const uow = createMockUnitOfWork();
    uow.charityAccounts.findById.mockResolvedValue({
      id: "charity_in_use",
      name: "Quỹ đang dùng",
      accountNo: "999888777",
    } as any);
    uow.charityAccounts.getUsageCount.mockResolvedValue(3);

    const deleteAccount = new DeleteCharityAccountUseCase(uow);
    await expect(
      deleteAccount.execute("charity_in_use", "admin_001")
    ).rejects.toThrow("đang được sử dụng");
  });

  it("Step 6: Admin danh sách charity accounts", async () => {
    const uow = createMockUnitOfWork();
    const accounts = [
      {
        id: "c1",
        name: "Quỹ A",
        accountNo: "111",
        bankName: "VCB",
        isActive: true,
        isDefault: true,
      },
      {
        id: "c2",
        name: "Quỹ B",
        accountNo: "222",
        bankName: "TCB",
        isActive: true,
        isDefault: false,
      },
    ];

    uow.charityAccounts.findAll.mockResolvedValue(accounts as any);

    const listAccounts = new ListCharityAccountsUseCase(uow);
    const result = await listAccounts.execute({ isActive: true });

    expect(result).toHaveLength(2);
  });

  it("Step 7: Admin cập nhật system config", async () => {
    const uow = createMockUnitOfWork();
    uow.systemConfig.setMultiple.mockResolvedValue(undefined);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const updateConfig = new UpdateSystemConfigUseCase(uow);
    await updateConfig.execute(
      [
        { key: SYSTEM_CONFIG_KEYS.ACTIVATION_AMOUNT, value: "20000" },
        { key: SYSTEM_CONFIG_KEYS.MIN_BOOKING_ADVANCE_HOURS, value: "4" },
        { key: SYSTEM_CONFIG_KEYS.LATE_CANCEL_THRESHOLD_MINUTES, value: "60" },
        { key: SYSTEM_CONFIG_KEYS.MAX_ACTIVE_BOOKINGS, value: "3" },
      ],
      "admin_001"
    );

    expect(uow.systemConfig.setMultiple).toHaveBeenCalledWith(
      expect.arrayContaining([
        { key: "activation_amount", value: "20000" },
        { key: "max_active_bookings", value: "3" },
      ]),
      "admin_001"
    );
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SYSTEM_CONFIG_UPDATED" })
    );
  });

  it("Step 7b: Không thể cập nhật config key không hợp lệ", async () => {
    const uow = createMockUnitOfWork();

    const updateConfig = new UpdateSystemConfigUseCase(uow);
    await expect(
      updateConfig.execute(
        [{ key: "invalid_key", value: "100" }],
        "admin_001"
      )
    ).rejects.toThrow("Config key không hợp lệ");
  });

  it("Step 7c: Admin xem system config", async () => {
    const uow = createMockUnitOfWork();
    const configs = [
      { id: "1", key: "activation_amount", value: "20000", description: null, updatedAt: new Date(), updatedBy: "admin_001" },
      { id: "2", key: "max_active_bookings", value: "3", description: null, updatedAt: new Date(), updatedBy: "admin_001" },
    ];

    uow.systemConfig.getAll.mockResolvedValue(configs);

    const getConfig = new GetSystemConfigUseCase(uow);
    const result = await getConfig.execute();

    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("activation_amount");
  });

  it("Step 8: Admin xem danh sách reports", async () => {
    const uow = createMockUnitOfWork();
    const reports = {
      reports: [
        {
          id: "report_001",
          reporterId: "mentee_001",
          reportedUserId: "mentor_001",
          sessionId: "sess_001",
          reason: "Nội dung không phù hợp",
          description: "Mentor dạy sai kiến thức",
          status: "PENDING",
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
          createdAt: new Date(),
        },
      ],
      total: 1,
    };

    uow.reports.findAll.mockResolvedValue(reports);

    const listReports = new ListReportsUseCase(uow);
    const result = await listReports.execute({ status: "PENDING" });

    expect(result.reports).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("Step 9: Admin xử lý report (resolve)", async () => {
    const uow = createMockUnitOfWork();
    const report = {
      id: "report_001",
      reporterId: "mentee_001",
      reportedUserId: "mentor_001",
      sessionId: "sess_001",
      reason: "Nội dung không phù hợp",
      description: "Chi tiết báo cáo",
      status: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date(),
    };

    const resolvedReport = {
      ...report,
      status: "RESOLVED",
      reviewedBy: "admin_001",
      reviewedAt: new Date(),
      reviewNote: "Đã xác nhận vi phạm, mentor bị cảnh cáo",
    };

    uow.reports.findById.mockResolvedValue(report);
    uow.reports.updateStatus.mockResolvedValue(resolvedReport);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const resolveReport = new ResolveReportUseCase(uow);
    const result = await resolveReport.execute(
      "report_001",
      "RESOLVED",
      "admin_001",
      "Đã xác nhận vi phạm, mentor bị cảnh cáo"
    );

    expect(result.status).toBe("RESOLVED");
    expect(result.reviewNote).toContain("Đã xác nhận vi phạm");
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REPORT_RESOLVED" })
    );
  });

  it("Step 9b: Admin dismiss report", async () => {
    const uow = createMockUnitOfWork();
    const report = {
      id: "report_002",
      reporterId: "mentee_002",
      reportedUserId: "mentor_002",
      sessionId: null,
      reason: "Spam",
      description: "Báo cáo không hợp lệ",
      status: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date(),
    };

    uow.reports.findById.mockResolvedValue(report);
    uow.reports.updateStatus.mockResolvedValue({
      ...report,
      status: "DISMISSED",
      reviewedBy: "admin_001",
      reviewNote: "Báo cáo không có cơ sở",
    });
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const resolveReport = new ResolveReportUseCase(uow);
    const result = await resolveReport.execute(
      "report_002",
      "DISMISSED",
      "admin_001",
      "Báo cáo không có cơ sở"
    );

    expect(result.status).toBe("DISMISSED");
  });

  it("Step 9c: Không thể xử lý report mà thiếu ghi chú", async () => {
    const uow = createMockUnitOfWork();

    const resolveReport = new ResolveReportUseCase(uow);
    await expect(
      resolveReport.execute("report_001", "RESOLVED", "admin_001", "")
    ).rejects.toThrow("Vui lòng nhập ghi chú xử lý");
  });

  it("Step 10: Admin xem leaderboard", async () => {
    const uow = createMockUnitOfWork();

    const topMentors = [
      { userId: "mt1", name: "Top Mentor 1", image: null, sessionCount: 25, totalAmount: 5000000 },
      { userId: "mt2", name: "Top Mentor 2", image: null, sessionCount: 18, totalAmount: 3600000 },
      { userId: "mt3", name: "Top Mentor 3", image: null, sessionCount: 12, totalAmount: 0 },
    ];
    const topMentees = [
      { userId: "me1", name: "Top Mentee 1", image: null, sessionCount: 10, totalAmount: 2000000 },
      { userId: "me2", name: "Top Mentee 2", image: null, sessionCount: 8, totalAmount: 1600000 },
    ];

    uow.sessions.getTopMentors.mockResolvedValue(topMentors);
    uow.sessions.getTopMentees.mockResolvedValue(topMentees);

    const getLeaderboard = new GetLeaderboardUseCase(uow);
    const result = await getLeaderboard.execute(6, 2025);

    expect(result.topMentors).toHaveLength(3);
    expect(result.topMentors[0].sessionCount).toBe(25);
    expect(result.topMentees).toHaveLength(2);
    expect(result.month).toBe(6);
    expect(result.year).toBe(2025);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 4: CROSS-ROLE INTERACTION
// Luồng tương tác đa vai trò hoàn chỉnh:
// Admin setup → Mentee đăng ký → Kích hoạt → Nộp đơn mentor →
// Admin duyệt → Mentor setup → Mentee mới đặt lịch → Mentor xác nhận →
// Hoàn thành → Thanh toán → Đánh giá → Report → Admin xử lý
// ═══════════════════════════════════════════════════════════════════════════════

describe("Scenario 4 – Cross-Role Complete Interaction", () => {
  let uow: ReturnType<typeof createMockUnitOfWork>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Full cross-role flow: Admin setup → Mentee journey → Mentor journey → Admin resolution", async () => {
    // ─── Phase 1: Admin thiết lập hệ thống ──────────────────────────────

    // 1a. Admin tạo charity account
    const charityAccount = {
      id: "charity_cross_001",
      name: "Quỹ Thiện Nguyện Trung Ương",
      accountNo: "1234567890",
      bankName: "Vietcombank",
      campaignKeyword: "HOCTUTHIEN",
      description: "Quỹ mặc định của hệ thống",
      isActive: true,
      isDefault: true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "admin_001",
      isDeleted: false,
      deletedAt: null,
    };

    uow.charityAccounts.findByAccountNo.mockResolvedValue(null);
    uow.charityAccounts.clearDefault.mockResolvedValue(undefined);
    uow.charityAccounts.create.mockResolvedValue(charityAccount);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const createCharity = new CreateCharityAccountUseCase(uow);
    const createdCharity = await createCharity.execute({
      name: "Quỹ Thiện Nguyện Trung Ương",
      accountNo: "1234567890",
      bankName: "Vietcombank",
      isDefault: true,
      adminId: "admin_001",
    });

    expect(createdCharity.isDefault).toBe(true);

    // 1b. Admin cập nhật system config
    uow.systemConfig.setMultiple.mockResolvedValue(undefined);

    const updateConfig = new UpdateSystemConfigUseCase(uow);
    await updateConfig.execute(
      [
        { key: SYSTEM_CONFIG_KEYS.ACTIVATION_AMOUNT, value: "10000" },
        { key: SYSTEM_CONFIG_KEYS.MAX_ACTIVE_BOOKINGS, value: "5" },
      ],
      "admin_001"
    );

    expect(uow.systemConfig.setMultiple).toHaveBeenCalled();

    // ─── Phase 2: Mentee đăng ký và kích hoạt ───────────────────────────

    // 2a. Mentee đăng ký qua Google OAuth
    const newMentee = buildUser({
      id: "cross_mentee_001",
      email: "mai@gmail.com",
      name: "Mai Phạm",
      status: UserStatus.PENDING_ACTIVATION,
      role: UserRole.MENTEE,
    });

    uow.users.findByEmail.mockResolvedValue(null);
    uow.users.save.mockResolvedValue(newMentee);

    const registerUser = new FindOrCreateUserUseCase(uow);
    const registeredMentee = await registerUser.execute({
      id: "cross_mentee_001",
      email: "mai@gmail.com",
      name: "Mai Phạm",
    });

    expect(registeredMentee.status).toBe(UserStatus.PENDING_ACTIVATION);

    // 2b. Kích hoạt tài khoản
    const activationPayment = buildPaymentRecord({
      id: "pay_cross_act",
      userId: "cross_mentee_001",
      type: PaymentType.ACTIVATION,
      amount: 10000,
      shortCode: "MAIACTI",
      transactionCode: "HOCTUTHIEN KICHHOAT MAIACTI",
    });

    uow.users.findById.mockResolvedValue(newMentee);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.payments.create.mockResolvedValue(activationPayment);
    uow.systemConfig.get.mockResolvedValue("10000");
    uow.charityAccounts.findDefault.mockResolvedValue(charityAccount);
    uow.systemConfig.getNumber.mockResolvedValue(24);

    const initActivation = new InitiateActivationUseCase(uow);
    const actInfo = await initActivation.execute({ userId: "cross_mentee_001" });

    expect(actInfo.amount).toBe(10000);

    // Xác nhận thanh toán
    uow.payments.findById.mockResolvedValue({ ...activationPayment, status: PaymentStatus.PENDING });
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);
    uow.payments.updateStatus.mockResolvedValue({ ...activationPayment, status: PaymentStatus.VERIFIED } as any);
    uow.users.findById
      .mockResolvedValueOnce(newMentee)
      .mockResolvedValueOnce(newMentee);
    uow.users.update.mockResolvedValue(newMentee.activate("system"));

    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: true,
      transaction: {
        id: "tn_cross_001",
        refId: "FT_CROSS_001",
        transactionTime: "2025-06-20T10:00:00",
        type: "CREDIT",
        transactionAmount: 10000,
        otherAccountDisplayName: "MAI PHAM",
        otherAccountName: "MAI PHAM",
        narrative: "HOCTUTHIEN KICHHOAT MAIACTI",
        incognito: false,
      },
      rawResponse: "{}",
    });

    const verifyAct = new VerifyPaymentUseCase(uow);
    const actResult = await verifyAct.execute({
      paymentId: "pay_cross_act",
      triggeredBy: "cross_mentee_001",
    });

    expect(actResult.success).toBe(true);

    // ─── Phase 3: Mentee nộp đơn và trở thành Mentor ────────────────────

    // Reset findById mock vì Phase 2 còn thừa mockResolvedValueOnce
    uow.users.findById.mockReset();

    const activeMentee = buildUser({
      id: "cross_mentee_001",
      email: "mai@gmail.com",
      name: "Mai Phạm",
      status: UserStatus.ACTIVE,
      role: UserRole.MENTEE,
    });

    // 3a. Mentee nộp đơn mentor
    const mentorApp = {
      id: "app_cross_001",
      userId: "cross_mentee_001",
      motivation: "Muốn giúp đỡ các bạn sinh viên",
      experience: "3 năm lập trình Python",
      linkedinUrl: null,
      contactInfo: null,
      status: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    uow.users.findById.mockResolvedValue(activeMentee);
    uow.mentorApplications.findByUserId.mockResolvedValue(null);
    uow.mentorApplications.create.mockResolvedValue(mentorApp);

    const submitApp = new SubmitMentorApplicationUseCase(uow);
    const submittedApp = await submitApp.execute({
      userId: "cross_mentee_001",
      motivation: "Muốn giúp đỡ các bạn sinh viên",
      experience: "3 năm lập trình Python",
    });

    expect(submittedApp.status).toBe("PENDING");

    // 3b. Admin duyệt đơn
    const approvedApp = { ...mentorApp, status: "APPROVED", reviewedBy: "admin_001" };
    const promotedUser = activeMentee.promoteToMentor("admin_001");
    const newMentorProfile = {
      id: "profile_cross_001",
      userId: "cross_mentee_001",
      bio: null,
      experience: null,
      headline: null,
      hourlyRate: 0,
      charityAccountId: null,
      onlyActivatedMentee: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { name: "Mai Phạm", email: "mai@gmail.com", image: null },
    };

    uow.mentorApplications.findById.mockResolvedValue(mentorApp);
    uow.mentorApplications.updateStatus.mockResolvedValue(approvedApp);
    uow.users.findById.mockResolvedValue(activeMentee);
    uow.users.update.mockResolvedValue(promotedUser);
    uow.mentorProfiles.findByUserId.mockResolvedValue(null);
    uow.mentorProfiles.create.mockResolvedValue(newMentorProfile as any);

    const approveApp = new ApproveMentorApplicationUseCase(uow);
    const approved = await approveApp.execute("app_cross_001", "admin_001");

    expect(approved.status).toBe("APPROVED");
    expect(approved.mentorProfile).toBeDefined();

    // ─── Phase 4: Một mentee khác đặt lịch với mentor mới ───────────────

    const anotherMentee = buildUser({
      id: "cross_mentee_002",
      email: "hoa@gmail.com",
      status: UserStatus.ACTIVE,
      role: UserRole.MENTEE,
    });
    const mentorUser = buildUser({
      id: "cross_mentee_001",
      role: UserRole.MENTOR,
      status: UserStatus.ACTIVE,
    });

    const bookedSession = buildFullSessionRecord({
      id: "sess_cross_001",
      menteeId: "cross_mentee_002",
      mentorId: "cross_mentee_001",
      title: "Học Python cơ bản",
      status: SessionStatus.PENDING,
      fee: 100000,
    });

    uow.users.findById
      .mockResolvedValueOnce(anotherMentee)
      .mockResolvedValueOnce(mentorUser);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(null);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 100000,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: charityAccount.id,
    });
    uow.systemConfig.getNumber
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5);
    uow.sessions.countActiveByMenteeId.mockResolvedValue(0);
    uow.sessions.findConflictingSession.mockResolvedValue(null);
    uow.sessions.create.mockResolvedValue(bookedSession);

    const bookSession = new BookSessionUseCase(uow);
    const booked = await bookSession.execute({
      menteeId: "cross_mentee_002",
      mentorId: "cross_mentee_001",
      title: "Học Python cơ bản",
      scheduledAt: nextTopOfHour(86400000),
    });

    expect(booked.status).toBe(SessionStatus.PENDING);
    expect(booked.fee).toBe(100000);

    // 4b. Mentor xác nhận buổi học
    uow.sessions.findById.mockResolvedValue(bookedSession);
    uow.sessions.updateStatus.mockResolvedValue({
      ...bookedSession,
      status: SessionStatus.CONFIRMED,
      meetLink: "https://meet.google.com/cross-test",
    } as any);

    const confirmSession = new ConfirmSessionUseCase(uow);
    const confirmed = await confirmSession.execute(
      "sess_cross_001",
      "cross_mentee_001",
      "https://meet.google.com/cross-test"
    );

    expect(confirmed.status).toBe(SessionStatus.CONFIRMED);

    // 4c. Mentor hoàn thành buổi học (có phí → PAYMENT_PENDING)
    const confirmedSess = {
      ...bookedSession,
      status: SessionStatus.CONFIRMED,
      fee: 100000,
    };
    uow.sessions.findById.mockResolvedValue(confirmedSess);
    uow.sessions.updateStatus.mockResolvedValue({
      ...confirmedSess,
      status: SessionStatus.PAYMENT_PENDING,
    } as any);

    const completeSession = new CompleteSessionUseCase(uow);
    const completed = await completeSession.execute("sess_cross_001", "cross_mentee_001");

    expect(completed.status).toBe(SessionStatus.PAYMENT_PENDING);

    // 4d. Mentee thanh toán học phí
    const sessPayment = buildPaymentRecord({
      id: "pay_cross_sess",
      userId: "cross_mentee_002",
      sessionId: "sess_cross_001",
      type: PaymentType.SESSION_FEE,
      amount: 100000,
    });

    uow.sessions.findById.mockResolvedValue({
      ...confirmedSess,
      status: SessionStatus.PAYMENT_PENDING,
    } as any);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 100000,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: charityAccount.id,
    });
    uow.charityAccounts.findById.mockResolvedValue(charityAccount);
    uow.systemConfig.getNumber.mockResolvedValue(24);
    uow.payments.create.mockResolvedValue(sessPayment);

    const initPayment = new InitiateSessionFeePaymentUseCase(uow);
    const payInfo = await initPayment.execute("sess_cross_001", "cross_mentee_002");

    expect(payInfo.amount).toBe(100000);

    // Xác nhận thanh toán
    uow.payments.findById.mockResolvedValue({ ...sessPayment, status: PaymentStatus.PENDING });
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);
    uow.payments.updateStatus.mockResolvedValue({ ...sessPayment, status: PaymentStatus.VERIFIED } as any);
    uow.sessions.findById.mockResolvedValue({
      ...confirmedSess,
      status: SessionStatus.PAYMENT_PENDING,
    } as any);
    uow.sessions.updateStatus.mockResolvedValue({
      ...confirmedSess,
      status: SessionStatus.COMPLETED,
    } as any);
    uow.mentorProfiles.incrementTotalSessions.mockResolvedValue(undefined);

    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: true,
      transaction: {
        id: "tn_cross_sess",
        refId: "FT_CROSS_SESS",
        transactionTime: "2025-06-25T15:00:00",
        type: "CREDIT",
        transactionAmount: 100000,
        otherAccountDisplayName: "HOA NGUYEN",
        otherAccountName: "HOA NGUYEN",
        narrative: "HOCTUTHIEN HOCPHI " + sessPayment.shortCode,
        incognito: false,
      },
      rawResponse: "{}",
    });

    const verifyPay = new VerifyPaymentUseCase(uow);
    const payResult = await verifyPay.execute({
      paymentId: "pay_cross_sess",
      triggeredBy: "cross_mentee_002",
    });

    expect(payResult.success).toBe(true);
    expect(payResult.message).toContain("Thanh toán học phí thành công");

    // ─── Phase 5: Đánh giá và báo cáo ───────────────────────────────────

    // 5a. Mentee đánh giá buổi học
    const completedSess = buildFullSessionRecord({
      id: "sess_cross_001",
      menteeId: "cross_mentee_002",
      mentorId: "cross_mentee_001",
      status: SessionStatus.COMPLETED,
      fee: 100000,
      rating: null,
    });

    uow.sessions.findById.mockResolvedValue(completedSess);
    uow.sessions.addRating.mockResolvedValue({
      ...completedSess,
      rating: 4,
      ratingComment: "Khá tốt, cần cải thiện tốc độ giảng dạy",
    } as any);
    uow.mentorProfiles.updateRatingStats.mockResolvedValue(undefined);

    const rateSession = new RateSessionUseCase(uow);
    const rateResult = await rateSession.execute(
      "sess_cross_001",
      "cross_mentee_002",
      4,
      "Khá tốt, cần cải thiện tốc độ giảng dạy"
    );

    expect(rateResult.rating).toBe(4);

    // 5b. Mentee nộp báo cáo
    const reportSess = buildFullSessionRecord({
      id: "sess_cross_001",
      menteeId: "cross_mentee_002",
      mentorId: "cross_mentee_001",
      status: SessionStatus.COMPLETED,
    });

    uow.users.findById
      .mockResolvedValueOnce(anotherMentee)
      .mockResolvedValueOnce(mentorUser);
    uow.sessions.findById.mockResolvedValue(reportSess);
    uow.reports.create.mockResolvedValue({
      id: "report_cross_001",
      reporterId: "cross_mentee_002",
      reportedUserId: "cross_mentee_001",
      sessionId: "sess_cross_001",
      reason: "Chất lượng kém",
      description: "Mentor đến muộn 20 phút và không chuẩn bị bài giảng, nội dung dạy sơ sài",
      status: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date(),
    });

    const submitReport = new SubmitReportUseCase(uow);
    const report = await submitReport.execute({
      reporterId: "cross_mentee_002",
      reportedUserId: "cross_mentee_001",
      sessionId: "sess_cross_001",
      reason: "Chất lượng kém",
      description: "Mentor đến muộn 20 phút và không chuẩn bị bài giảng, nội dung dạy sơ sài",
    });

    expect(report.status).toBe("PENDING");

    // ─── Phase 6: Admin xử lý report ────────────────────────────────────

    uow.reports.findById.mockResolvedValue(report);
    uow.reports.updateStatus.mockResolvedValue({
      ...report,
      status: "RESOLVED",
      reviewedBy: "admin_001",
      reviewNote: "Đã xác nhận vi phạm. Mentor sẽ bị nhắc nhở.",
    });

    const resolveReport = new ResolveReportUseCase(uow);
    const resolved = await resolveReport.execute(
      "report_cross_001",
      "RESOLVED",
      "admin_001",
      "Đã xác nhận vi phạm. Mentor sẽ bị nhắc nhở."
    );

    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.reviewNote).toContain("Đã xác nhận vi phạm");

    // ─── Phase 7: Kiểm tra leaderboard cuối cùng ─────────────────────────

    uow.sessions.getTopMentors.mockResolvedValue([
      { userId: "cross_mentee_001", name: "Mai Phạm", image: null, sessionCount: 1, totalAmount: 100000 },
    ]);
    uow.sessions.getTopMentees.mockResolvedValue([
      { userId: "cross_mentee_002", name: "Hoa Nguyễn", image: null, sessionCount: 1, totalAmount: 100000 },
    ]);

    const leaderboard = new GetLeaderboardUseCase(uow);
    const lb = await leaderboard.execute(6, 2025);

    expect(lb.topMentors).toHaveLength(1);
    expect(lb.topMentors[0].name).toBe("Mai Phạm");
    expect(lb.topMentees).toHaveLength(1);
    expect(lb.topMentees[0].name).toBe("Hoa Nguyễn");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 5: EDGE CASES & ERROR FLOWS
// Các trường hợp biên và luồng lỗi quan trọng
// ═══════════════════════════════════════════════════════════════════════════════

describe("Scenario 5 – Edge Cases & Error Flows", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Mentee chưa kích hoạt không thể đặt buổi học có phí (BR03)", async () => {
    const uow = createMockUnitOfWork();
    const pendingMentee = buildUser({
      id: "pending_mentee",
      status: UserStatus.PENDING_ACTIVATION,
      role: UserRole.MENTEE,
    });
    const mentor = buildMentor();

    uow.users.findById
      .mockResolvedValueOnce(pendingMentee)
      .mockResolvedValueOnce(mentor);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(null);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 100000,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: null,
    });
    uow.systemConfig.getNumber
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5);

    const bookSession = new BookSessionUseCase(uow);
    await expect(
      bookSession.execute({
        menteeId: "pending_mentee",
        mentorId: mentor.id,
        title: "Buổi học có phí",
        scheduledAt: new Date(Date.now() + 86400000),
      })
    ).rejects.toThrow("Tài khoản chưa được kích hoạt");
  });

  it("Không thể đặt lịch quá giới hạn active bookings (BR05)", async () => {
    const uow = createMockUnitOfWork();
    const mentee = buildUser({ id: "busy_mentee", status: UserStatus.ACTIVE });
    const mentor = buildMentor();

    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(mentor);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(null);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 0,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: null,
    });
    uow.systemConfig.getNumber
      .mockResolvedValueOnce(2)   // min advance
      .mockResolvedValueOnce(3);  // max active = 3
    uow.sessions.countActiveByMenteeId.mockResolvedValue(3); // đã đạt giới hạn

    const bookSession = new BookSessionUseCase(uow);
    await expect(
      bookSession.execute({
        menteeId: "busy_mentee",
        mentorId: mentor.id,
        title: "Thêm buổi học",
        scheduledAt: new Date(Date.now() + 86400000),
      })
    ).rejects.toThrow("đang có 3 buổi học đang hoạt động");
  });

  it("Không thể đặt lịch quá gần thời điểm hiện tại (BR10)", async () => {
    const uow = createMockUnitOfWork();
    const mentee = buildUser({ id: "rush_mentee", status: UserStatus.ACTIVE });
    const mentor = buildMentor();

    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(mentor);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(null);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 0,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: null,
    });
    uow.systemConfig.getNumber
      .mockResolvedValueOnce(2)   // min advance = 2 hours
      .mockResolvedValueOnce(5);
    uow.sessions.countActiveByMenteeId.mockResolvedValue(0);

    const bookSession = new BookSessionUseCase(uow);
    await expect(
      bookSession.execute({
        menteeId: "rush_mentee",
        mentorId: mentor.id,
        title: "Buổi học gấp",
        scheduledAt: new Date(Date.now() + 30 * 60 * 1000), // 30 phút nữa
      })
    ).rejects.toThrow("phải được đặt trước ít nhất");
  });

  it("Không thể đánh giá buổi học đã đánh giá rồi", async () => {
    const uow = createMockUnitOfWork();
    const ratedSession = buildFullSessionRecord({
      id: "sess_rated",
      menteeId: "mentee_001",
      status: SessionStatus.COMPLETED,
      rating: 4,
      ratingComment: "Tốt",
    });

    uow.sessions.findById.mockResolvedValue(ratedSession);

    const rateSession = new RateSessionUseCase(uow);
    await expect(
      rateSession.execute("sess_rated", "mentee_001", 5, "Xuất sắc")
    ).rejects.toThrow("đã được đánh giá");
  });

  it("Đánh giá ngoài khoảng 1-5 sao bị reject", async () => {
    const rateSession = new RateSessionUseCase(createMockUnitOfWork());
    await expect(
      rateSession.execute("sess_001", "mentee_001", 0, "Zero star")
    ).rejects.toThrow("Đánh giá phải từ 1-5 sao");

    await expect(
      rateSession.execute("sess_001", "mentee_001", 6, "Six star")
    ).rejects.toThrow("Đánh giá phải từ 1-5 sao");
  });

  it("Huỷ buổi học muộn bị ghi nhận late cancellation (BR35)", async () => {
    const uow = createMockUnitOfWork();
    const soonSession = buildFullSessionRecord({
      id: "sess_late_cancel",
      menteeId: "mentee_late",
      mentorId: "mentor_001",
      status: SessionStatus.PENDING,
      scheduledAt: new Date(Date.now() + 30 * 60 * 1000), // 30 phút nữa
    });

    uow.sessions.findById.mockResolvedValue(soonSession);
    uow.systemConfig.getNumber.mockResolvedValue(120); // threshold 120 phút
    uow.sessions.updateStatus.mockResolvedValue({
      ...soonSession,
      status: SessionStatus.CANCELLED,
      isLateCancellation: true,
    } as any);
    uow.users.incrementLateCancellation.mockResolvedValue(undefined);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const cancelSession = new CancelSessionUseCase(uow);
    const result = await cancelSession.execute(
      "sess_late_cancel",
      "mentee_late",
      "Có việc gấp"
    );

    expect(result.status).toBe(SessionStatus.CANCELLED);
    expect(result.isLateCancellation).toBe(true);
    expect(uow.users.incrementLateCancellation).toHaveBeenCalledWith("mentee_late");
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LATE_CANCELLATION" })
    );
  });

  it("Không thể huỷ buổi học đã hoàn thành", async () => {
    const uow = createMockUnitOfWork();
    const completedSession = buildFullSessionRecord({
      id: "sess_completed",
      menteeId: "mentee_001",
      status: SessionStatus.COMPLETED,
    });

    uow.sessions.findById.mockResolvedValue(completedSession);

    const cancelSession = new CancelSessionUseCase(uow);
    await expect(
      cancelSession.execute("sess_completed", "mentee_001", "Muốn huỷ")
    ).rejects.toThrow("Không thể huỷ");
  });

  it("Xác nhận hoàn thành với Meet link không hợp lệ bị reject", async () => {
    const uow = createMockUnitOfWork();
    const session = buildFullSessionRecord({
      id: "sess_invalid_meet",
      mentorId: "mentor_001",
      status: SessionStatus.CONFIRMED,
    });

    uow.sessions.findById.mockResolvedValue(session);

    const confirmCompletion = new ConfirmCompletionUseCase(uow);
    await expect(
      confirmCompletion.execute("sess_invalid_meet", "mentor_001", "not-a-valid-url")
    ).rejects.toThrow("Link Google Meet không hợp lệ");
  });

  it("Không thể đặt buổi học khi mentor đã có lịch trùng", async () => {
    const uow = createMockUnitOfWork();
    const mentee = buildUser({ id: "mentee_conflict", status: UserStatus.ACTIVE });
    const mentor = buildMentor();

    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(mentor);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(null);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 0,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: null,
    });
    uow.systemConfig.getNumber
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5);
    uow.sessions.countActiveByMenteeId.mockResolvedValue(0);
    uow.sessions.findConflictingSession.mockResolvedValue(
      buildFullSessionRecord({ id: "existing_sess" })
    );

    const bookSession = new BookSessionUseCase(uow);
    await expect(
      bookSession.execute({
        menteeId: "mentee_conflict",
        mentorId: mentor.id,
        title: "Buổi trùng lịch",
        scheduledAt: nextTopOfHour(86400000),
      })
    ).rejects.toThrow("đã có lịch học vào thời điểm này");
  });

  it("Mentor vắng mặt buổi có phí → PAYMENT_PENDING (không phải NO_SHOW trực tiếp)", async () => {
    const uow = createMockUnitOfWork();
    const pastTime = new Date(Date.now() - 3600000);
    const paidSession = buildFullSessionRecord({
      id: "sess_noshow_paid",
      mentorId: "mentor_001",
      menteeId: "mentee_noshow_paid",
      status: SessionStatus.CONFIRMED,
      fee: 200000,
      scheduledAt: pastTime,
    });

    uow.sessions.findById.mockResolvedValue(paidSession);
    uow.sessions.updateStatus.mockResolvedValue({
      ...paidSession,
      status: SessionStatus.PAYMENT_PENDING,
      isNoShow: true,
    } as any);
    uow.users.incrementNoShow.mockResolvedValue(undefined);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const markNoShow = new MarkNoShowUseCase(uow);
    const result = await markNoShow.execute("sess_noshow_paid", "mentor_001");

    expect(result.status).toBe(SessionStatus.PAYMENT_PENDING);
    expect(result.isNoShow).toBe(true);
    expect(uow.users.incrementNoShow).toHaveBeenCalledWith("mentee_noshow_paid");
  });

  it("Report mô tả quá ngắn bị reject", async () => {
    const uow = createMockUnitOfWork();

    const submitReport = new SubmitReportUseCase(uow);
    await expect(
      submitReport.execute({
        reporterId: "mentee_001",
        reportedUserId: "mentor_001",
        reason: "Spam",
        description: "Ngắn quá",  // < 20 ký tự
      })
    ).rejects.toThrow("ít nhất 20 ký tự");
  });

  it("Thanh toán hết hạn trả về lỗi", async () => {
    const uow = createMockUnitOfWork();
    const expiredPayment = buildPaymentRecord({
      id: "pay_expired",
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() - 86400000), // hết hạn hôm qua
    });

    uow.payments.findById.mockResolvedValue(expiredPayment);
    uow.payments.updateStatus.mockResolvedValue({ ...expiredPayment, status: PaymentStatus.FAILED } as any);

    const verifyPayment = new VerifyPaymentUseCase(uow);
    const result = await verifyPayment.execute({
      paymentId: "pay_expired",
      triggeredBy: "user_001",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("hết hạn");
  });

  it("Không thể báo cáo buổi học đang chờ xác nhận", async () => {
    const uow = createMockUnitOfWork();
    const reporter = buildUser({ id: "reporter_001", status: UserStatus.ACTIVE });
    const reported = buildMentor();
    const pendingSession = buildFullSessionRecord({
      id: "sess_pending_report",
      menteeId: "reporter_001",
      mentorId: reported.id,
      status: SessionStatus.PENDING,
    });

    uow.users.findById
      .mockResolvedValueOnce(reporter)
      .mockResolvedValueOnce(reported);
    uow.sessions.findById.mockResolvedValue(pendingSession);

    const submitReport = new SubmitReportUseCase(uow);
    await expect(
      submitReport.execute({
        reporterId: "reporter_001",
        reportedUserId: reported.id,
        sessionId: "sess_pending_report",
        reason: "Vi phạm",
        description: "Chi tiết báo cáo vi phạm phải dài ít nhất 20 ký tự",
      })
    ).rejects.toThrow("Chỉ có thể báo cáo sau khi buổi học kết thúc");
  });
});
