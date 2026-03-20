/**
 * End-to-End Scenario Tests
 *
 * These tests validate complete business flows using mocked external services.
 * They exercise the full stack: Use Cases → Repositories → Domain
 *
 * Scenarios covered:
 * 1. New user registration + activation flow
 * 2. Full session lifecycle (book → confirm → complete → pay)
 * 3. Admin role management flow
 * 4. Leaderboard data accuracy
 */

import {
  FindOrCreateUserUseCase,
  ChangeUserRoleUseCase,
  ListUsersUseCase,
} from "@/application/use-cases/user/UserUseCases";
import {
  InitiateActivationUseCase,
  VerifyPaymentUseCase,
} from "@/application/use-cases/payment/PaymentUseCases";
import {
  BookSessionUseCase,
  ConfirmSessionUseCase,
  CompleteSessionUseCase,
  RateSessionUseCase,
  GetLeaderboardUseCase,
} from "@/application/use-cases/session/SessionUseCases";
import {
  PaymentStatus,
  PaymentType,
  SessionStatus,
  ACTIVATION_AMOUNT,
  generateShortCode,
  buildTransactionContent,
} from "@/domain/value-objects/Payment";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import {
  buildUser,
  buildAdmin,
  buildMentor,
  buildPaymentRecord,
  buildSessionRecord,
  createMockUnitOfWork,
} from "@/__tests__/helpers";

jest.mock("@/infrastructure/external/ThienNguyenAppClient", () => ({
  tnAppClient: { findTransactionByCode: jest.fn() },
}));

jest.mock("@/infrastructure/external/GoogleMeetService", () => ({
  meetService: {
    createMeetLink: jest.fn().mockResolvedValue({
      meetLink: "https://meet.google.com/e2e-test-link",
      meetId: "e2e-test-link",
    }),
  },
}));

import { tnAppClient } from "@/infrastructure/external/ThienNguyenAppClient";
const mockTnClient = tnAppClient as jest.Mocked<typeof tnAppClient>;

// ─── Scenario 1: New User Registration & Activation ───────────────────────────

describe("Scenario 1 – New User Registration & Activation", () => {
  it("completes the full activation flow: register → initiate → verify → activate", async () => {
    const uow = createMockUnitOfWork();

    // Step 1: User signs in with Google for the first time
    const newUser = buildUser({
      id: "new_user_001",
      email: "newbie@gmail.com",
      status: UserStatus.PENDING_ACTIVATION,
    });

    uow.users.findByEmail.mockResolvedValue(null);
    uow.users.save.mockResolvedValue(newUser);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const findOrCreate = new FindOrCreateUserUseCase(uow);
    const userDTO = await findOrCreate.execute({
      id: "new_user_001",
      email: "newbie@gmail.com",
      name: "Newbie",
    });

    expect(userDTO.role).toBe(UserRole.MENTEE);
    expect(userDTO.status).toBe(UserStatus.PENDING_ACTIVATION);

    // Step 2: Initiate activation payment
    const paymentRecord = buildPaymentRecord({
      userId: "new_user_001",
      type: PaymentType.ACTIVATION,
      amount: ACTIVATION_AMOUNT,
      shortCode: "NEWACT",
      transactionCode: "HOCTUTHIEN KICHHOAT NEWACT",
    });

    uow.users.findById.mockResolvedValue(newUser);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.payments.create.mockResolvedValue(paymentRecord);

    const initiateActivation = new InitiateActivationUseCase(uow);
    const activationInfo = await initiateActivation.execute({ userId: "new_user_001" });

    expect(activationInfo.amount).toBe(ACTIVATION_AMOUNT);
    expect(activationInfo.transactionCode).toContain("KICHHOAT");
    expect(activationInfo.qrImageUrl).toContain("vietqr.io");

    // Step 3: User completes bank transfer, clicks "Tôi đã chuyển khoản"
    uow.payments.findById.mockResolvedValue({
      ...paymentRecord,
      status: PaymentStatus.PENDING,
    });
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);

    const verifiedRecord = { ...paymentRecord, status: PaymentStatus.VERIFIED };
    uow.payments.updateStatus.mockResolvedValue(verifiedRecord as any);
    uow.users.findById
      .mockResolvedValueOnce(newUser)  // in verifyPayment
      .mockResolvedValueOnce(newUser); // in activateUser
    uow.users.update.mockResolvedValue(newUser.activate("system"));

    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: true,
      transaction: {
        id: "tn_001",
        refId: "FT12345",
        transactionTime: "2025-01-01T10:00:00",
        type: "CREDIT",
        transactionAmount: ACTIVATION_AMOUNT,
        otherAccountDisplayName: "NEWBIE",
        otherAccountName: "NEWBIE",
        narrative: "HOCTUTHIEN KICHHOAT NEWACT",
        incognito: false,
      },
      rawResponse: "{}",
    });

    const verifyPayment = new VerifyPaymentUseCase(uow);
    const verifyResult = await verifyPayment.execute({
      paymentId: paymentRecord.id,
      triggeredBy: "new_user_001",
    });

    // Step 4: Account should now be activated
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.message).toContain("Kích hoạt tài khoản thành công");
    expect(uow.users.update).toHaveBeenCalledTimes(1);
  });
});

// ─── Scenario 2: Full Session Lifecycle ──────────────────────────────────────

describe("Scenario 2 – Full Session Lifecycle", () => {
  it("completes: book → confirm (with Meet) → complete → payment required", async () => {
    const mentee = buildUser({
      id: "mentee_s2",
      status: UserStatus.ACTIVE,
      role: UserRole.MENTEE,
    });
    const mentor = buildMentor();

    // Step 1: Mentee books a session
    const pendingSession = buildSessionRecord({
      id: "sess_s2",
      menteeId: "mentee_s2",
      mentorId: mentor.id,
      status: SessionStatus.PENDING,
      fee: 200000,
    });

    const uow = createMockUnitOfWork();
    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(mentor);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(null);
    uow.sessions.create.mockResolvedValue(pendingSession);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const bookSession = new BookSessionUseCase(uow);
    const booked = await bookSession.execute({
      menteeId: "mentee_s2",
      mentorId: mentor.id,
      title: "Học NodeJS cơ bản",
      scheduledAt: new Date(Date.now() + 86400000),
    });
    expect(booked.status).toBe(SessionStatus.PENDING);

    // Step 2: Mentor confirms and Meet link is generated
    const confirmedSession = {
      ...pendingSession,
      status: SessionStatus.CONFIRMED,
      meetLink: "https://meet.google.com/e2e-test-link",
    };

    uow.sessions.findById.mockResolvedValue(pendingSession);
    uow.sessions.updateStatus.mockResolvedValue(confirmedSession as any);

    const confirmSession = new ConfirmSessionUseCase(uow);
    const confirmed = await confirmSession.execute(booked.id, mentor.id);

    expect(confirmed.status).toBe(SessionStatus.CONFIRMED);
    expect(confirmed.meetLink).toContain("meet.google.com");

    // Step 3: After session, mentor marks it complete
    // Since fee > 0, status should become PAYMENT_PENDING
    const payPendingSession = {
      ...confirmedSession,
      status: SessionStatus.PAYMENT_PENDING,
      endAt: new Date(),
    };

    uow.sessions.findById.mockResolvedValue(confirmedSession as any);
    uow.sessions.updateStatus.mockResolvedValue(payPendingSession as any);

    const completeSession = new CompleteSessionUseCase(uow);
    const completed = await completeSession.execute(booked.id, mentor.id);

    expect(completed.status).toBe(SessionStatus.PAYMENT_PENDING);

    // Step 4: Mentee cannot book another session while in PAYMENT_PENDING
    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(mentor);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(payPendingSession as any);

    await expect(
      bookSession.execute({
        menteeId: "mentee_s2",
        mentorId: mentor.id,
        title: "Another session",
        scheduledAt: new Date(Date.now() + 172800000),
      })
    ).rejects.toThrow("còn buổi học chưa thanh toán");
  });

  it("free session completes without payment step", async () => {
    const mentee = buildUser({ status: UserStatus.ACTIVE });
    const mentor = buildMentor();
    const freeSession = buildSessionRecord({
      fee: 0,
      status: SessionStatus.CONFIRMED,
      mentorId: mentor.id,
    });
    const completedSession = { ...freeSession, status: SessionStatus.COMPLETED };

    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(freeSession);
    uow.sessions.updateStatus.mockResolvedValue(completedSession as any);

    const result = await new CompleteSessionUseCase(uow).execute(
      freeSession.id,
      mentor.id
    );

    // Free session goes directly to COMPLETED
    expect(result.status).toBe(SessionStatus.COMPLETED);
    expect(uow.sessions.updateStatus).toHaveBeenCalledWith(
      freeSession.id,
      SessionStatus.COMPLETED,
      expect.anything()
    );
  });

  it("mentee rates session after completion", async () => {
    const completedSession = buildSessionRecord({
      status: SessionStatus.COMPLETED,
      menteeId: "me_rate",
      rating: null,
    });
    const rated = { ...completedSession, rating: 5, ratingComment: "Xuất sắc!" };

    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(completedSession);
    uow.sessions.addRating.mockResolvedValue(rated as any);

    const result = await new RateSessionUseCase(uow).execute(
      completedSession.id,
      "me_rate",
      5,
      "Xuất sắc!"
    );

    expect(result.rating).toBe(5);
    expect(result.ratingComment).toBe("Xuất sắc!");
  });
});

// ─── Scenario 3: Admin Role Management ───────────────────────────────────────

describe("Scenario 3 – Admin Role Management", () => {
  it("admin promotes mentee → mentor → demotes back to mentee", async () => {
    const admin = buildAdmin();
    const mentee = buildUser({ id: "promo_user", role: UserRole.MENTEE });

    const uow = createMockUnitOfWork();
    uow.users.createAuditLog.mockResolvedValue(undefined);

    // Promote to mentor
    const promotedEntity = mentee.promoteToMentor(admin.id);
    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(admin);
    uow.users.update.mockResolvedValue(promotedEntity);

    const changeRole = new ChangeUserRoleUseCase(uow);
    const asMentor = await changeRole.execute({
      userId: mentee.id,
      newRole: UserRole.MENTOR,
      performedBy: admin.id,
    });
    expect(asMentor.role).toBe(UserRole.MENTOR);

    // Demote back to mentee
    const demotedEntity = promotedEntity.demoteToMentee(admin.id);
    uow.users.findById
      .mockResolvedValueOnce(promotedEntity)
      .mockResolvedValueOnce(admin);
    uow.users.update.mockResolvedValue(demotedEntity);

    const asMentee = await changeRole.execute({
      userId: mentee.id,
      newRole: UserRole.MENTEE,
      performedBy: admin.id,
    });
    expect(asMentee.role).toBe(UserRole.MENTEE);

    // Audit log called twice
    expect(uow.users.createAuditLog).toHaveBeenCalledTimes(2);
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ROLE_CHANGE" })
    );
  });

  it("non-admin cannot change roles", async () => {
    const regularUser = buildUser({ role: UserRole.MENTEE });
    const target = buildUser({ id: "target_user" });

    const uow = createMockUnitOfWork();
    uow.users.findById
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce(regularUser);

    await expect(
      new ChangeUserRoleUseCase(uow).execute({
        userId: "target_user",
        newRole: UserRole.MENTOR,
        performedBy: regularUser.id,
      })
    ).rejects.toThrow("Only admins");
  });
});

// ─── Scenario 4: Leaderboard ──────────────────────────────────────────────────

describe("Scenario 4 – Monthly Leaderboard", () => {
  it("returns correct top mentors and mentees for the month", async () => {
    const now = new Date();
    const topMentors = [
      { userId: "mt1", name: "Anh Mentor", image: null, sessionCount: 15, totalAmount: 3000000 },
      { userId: "mt2", name: "Bình Mentor", image: null, sessionCount: 10, totalAmount: 0 },
    ];
    const topMentees = [
      { userId: "me1", name: "Linh Mentee", image: null, sessionCount: 8, totalAmount: 1600000 },
    ];

    const uow = createMockUnitOfWork();
    uow.sessions.getTopMentors.mockResolvedValue(topMentors);
    uow.sessions.getTopMentees.mockResolvedValue(topMentees);

    const result = await new GetLeaderboardUseCase(uow).execute(
      now.getMonth() + 1,
      now.getFullYear()
    );

    expect(result.topMentors).toHaveLength(2);
    expect(result.topMentors[0].sessionCount).toBe(15);
    expect(result.topMentors[0].totalAmount).toBe(3000000);

    expect(result.topMentees).toHaveLength(1);
    expect(result.topMentees[0].name).toBe("Linh Mentee");
  });

  it("returns empty arrays when no activity this month", async () => {
    const uow = createMockUnitOfWork();
    uow.sessions.getTopMentors.mockResolvedValue([]);
    uow.sessions.getTopMentees.mockResolvedValue([]);

    const result = await new GetLeaderboardUseCase(uow).execute(1, 2000);
    expect(result.topMentors).toEqual([]);
    expect(result.topMentees).toEqual([]);
  });
});
