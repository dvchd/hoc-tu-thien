import {
  BookSessionUseCase,
  ConfirmSessionUseCase,
  CancelSessionUseCase,
  CompleteSessionUseCase,
  RateSessionUseCase,
  GetLeaderboardUseCase,
} from "@/application/use-cases/session/SessionUseCases";
import { SessionStatus } from "@/domain/value-objects/Payment";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { UserRole } from "@/domain/value-objects/UserRole";
import {
  buildUser,
  buildMentor,
  buildSessionRecord,
  createMockUnitOfWork,
} from "@/__tests__/helpers";

// ─── Mock Services ──────────────────────────────────────────────────────────

jest.mock("@/infrastructure/external/ThienNguyenAppClient", () => ({
  tnAppClient: {
    findTransactionByCode: jest.fn(),
  },
}));

// ─── BookSessionUseCase ───────────────────────────────────────────────────────

describe("BookSessionUseCase", () => {
  it("creates a session when mentee is active and has no debt", async () => {
    const mentee = buildUser({ id: "mentee_01", status: UserStatus.ACTIVE });
    const mentor = buildMentor();
    const session = buildSessionRecord();

    const uow = createMockUnitOfWork();
    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(mentor);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(null);
    uow.sessions.create.mockResolvedValue(session);
    uow.users.createAuditLog.mockResolvedValue(undefined);
    uow.systemConfig.getNumber.mockResolvedValue(10); // Mock config

    const result = await new BookSessionUseCase(uow).execute({
      menteeId: mentee.id,
      mentorId: mentor.id,
      title: "Học ReactJS",
      scheduledAt: new Date(Date.now() + 86400000),
    });

    expect(result.id).toBe(session.id);
    expect(uow.sessions.create).toHaveBeenCalledTimes(1);
  });

  it("throws when mentee account is not active", async () => {
    const pendingMentee = buildUser({
      id: "m1",
      status: UserStatus.PENDING_ACTIVATION,
    });

    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(pendingMentee);
    uow.systemConfig.getNumber.mockResolvedValue(10);

    await expect(
      new BookSessionUseCase(uow).execute({
        menteeId: "m1",
        mentorId: "mentor_01",
        title: "Test",
        scheduledAt: new Date(),
      })
    ).rejects.toThrow("Tài khoản chưa được kích hoạt");
  });

  it("throws when mentee has unpaid session", async () => {
    const mentee = buildUser({ id: "m1", status: UserStatus.ACTIVE });
    const unpaidSession = buildSessionRecord({
      status: SessionStatus.PAYMENT_PENDING,
    });

    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(mentee);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(unpaidSession);
    uow.systemConfig.getNumber.mockResolvedValue(10);

    await expect(
      new BookSessionUseCase(uow).execute({
        menteeId: "m1",
        mentorId: "mentor_01",
        title: "Test",
        scheduledAt: new Date(),
      })
    ).rejects.toThrow("còn buổi học chưa thanh toán");
  });

  it("throws when mentor user is not found", async () => {
    const mentee = buildUser({ status: UserStatus.ACTIVE });

    const uow = createMockUnitOfWork();
    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(null); // mentor not found
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(null);
    uow.systemConfig.getNumber.mockResolvedValue(10);

    await expect(
      new BookSessionUseCase(uow).execute({
        menteeId: mentee.id,
        mentorId: "ghost_mentor",
        title: "Test",
        scheduledAt: new Date(),
      })
    ).rejects.toThrow("Không tìm thấy Mentor");
  });

  it("throws when chosen user is not a Mentor", async () => {
    const mentee = buildUser({ id: "m1", status: UserStatus.ACTIVE });
    const anotherMentee = buildUser({ id: "m2", role: UserRole.MENTEE });

    const uow = createMockUnitOfWork();
    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(anotherMentee);
    uow.sessions.findPendingPaymentByMenteeId.mockResolvedValue(null);
    uow.systemConfig.getNumber.mockResolvedValue(10);

    await expect(
      new BookSessionUseCase(uow).execute({
        menteeId: "m1",
        mentorId: "m2",
        title: "Test",
        scheduledAt: new Date(),
      })
    ).rejects.toThrow("không phải là Mentor");
  });
});

// ─── ConfirmSessionUseCase ────────────────────────────────────────────────────

describe("ConfirmSessionUseCase", () => {
  it("confirms session and creates a Meet link", async () => {
    const session = buildSessionRecord({
      status: SessionStatus.PENDING,
      mentorId: "mentor_01",
    });
    const confirmed = {
      ...session,
      status: SessionStatus.CONFIRMED,
      meetLink: "https://meet.google.com/abc-defg-hij",
    };

    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(session);
    uow.sessions.updateStatus.mockResolvedValue(confirmed as any);

    const result = await new ConfirmSessionUseCase(uow).execute(
      session.id,
      "mentor_01"
    );

    expect(result.status).toBe(SessionStatus.CONFIRMED);
    expect(uow.sessions.updateStatus).toHaveBeenCalledWith(
      session.id,
      SessionStatus.CONFIRMED,
      expect.objectContaining({ meetLink: expect.stringContaining("meet.google") })
    );
  });

  it("throws when session not in PENDING state", async () => {
    const session = buildSessionRecord({ status: SessionStatus.CONFIRMED });

    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(session);

    await expect(
      new ConfirmSessionUseCase(uow).execute(session.id, session.mentorId)
    ).rejects.toThrow("không trong trạng thái chờ xác nhận");
  });

  it("throws when another mentor tries to confirm", async () => {
    const session = buildSessionRecord({
      status: SessionStatus.PENDING,
      mentorId: "mentor_01",
    });

    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(session);

    await expect(
      new ConfirmSessionUseCase(uow).execute(session.id, "different_mentor")
    ).rejects.toThrow("không có quyền");
  });
});

// ─── CancelSessionUseCase ─────────────────────────────────────────────────────

describe("CancelSessionUseCase", () => {
  it("allows mentee to cancel a PENDING session", async () => {
    const session = buildSessionRecord({
      status: SessionStatus.PENDING,
      menteeId: "mentee_01",
    });
    const cancelled = { ...session, status: SessionStatus.CANCELLED };

    const uow = createMockUnitOfWork();
      uow.sessions.findById.mockResolvedValue(session);
      uow.systemConfig.getNumber.mockResolvedValue(30);
      uow.sessions.updateStatus.mockResolvedValue(cancelled as any);


    const result = await new CancelSessionUseCase(uow).execute(
      session.id,
      "mentee_01",
      "Lịch bận"
    );

    expect(result.status).toBe(SessionStatus.CANCELLED);
    expect(uow.sessions.updateStatus).toHaveBeenCalledWith(
      session.id,
      SessionStatus.CANCELLED,
      expect.objectContaining({ cancelReason: "Lịch bận" })
    );
  });

  it("allows mentor to cancel a CONFIRMED session", async () => {
    const session = buildSessionRecord({
      status: SessionStatus.CONFIRMED,
      mentorId: "mentor_01",
    });
    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(session);
    uow.systemConfig.getNumber.mockResolvedValue(30);
    uow.sessions.updateStatus.mockResolvedValue({
      ...session,
      status: SessionStatus.CANCELLED,
    } as any);

    const result = await new CancelSessionUseCase(uow).execute(
      session.id,
      "mentor_01"
    );
    expect(result.status).toBe(SessionStatus.CANCELLED);
  });

  it("throws when unrelated user tries to cancel", async () => {
    const session = buildSessionRecord({ menteeId: "m1", mentorId: "mt1" });
    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(session);

    await expect(
      new CancelSessionUseCase(uow).execute(session.id, "stranger")
    ).rejects.toThrow("không có quyền huỷ");
  });

  it("throws when trying to cancel a COMPLETED session", async () => {
    const session = buildSessionRecord({ status: SessionStatus.COMPLETED, menteeId: "m1" });
    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(session);

    await expect(
      new CancelSessionUseCase(uow).execute(session.id, "m1")
    ).rejects.toThrow("Không thể huỷ");
  });
});

// ─── CompleteSessionUseCase ───────────────────────────────────────────────────

describe("CompleteSessionUseCase", () => {
  it("sets status to COMPLETED for free session", async () => {
    const session = buildSessionRecord({
      status: SessionStatus.CONFIRMED,
      mentorId: "mt1",
      fee: 0,
    });
    const completed = { ...session, status: SessionStatus.COMPLETED };

    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(session);
    uow.sessions.updateStatus.mockResolvedValue(completed as any);

    const result = await new CompleteSessionUseCase(uow).execute(session.id, "mt1");
    expect(result.status).toBe(SessionStatus.COMPLETED);
  });

  it("sets status to PAYMENT_PENDING for paid session", async () => {
    const session = buildSessionRecord({
      status: SessionStatus.CONFIRMED,
      mentorId: "mt1",
      fee: 200000,
    });
    const payPending = { ...session, status: SessionStatus.PAYMENT_PENDING };

    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(session);
    uow.sessions.updateStatus.mockResolvedValue(payPending as any);

    const result = await new CompleteSessionUseCase(uow).execute(session.id, "mt1");
    expect(result.status).toBe(SessionStatus.PAYMENT_PENDING);
    expect(uow.sessions.updateStatus).toHaveBeenCalledWith(
      session.id,
      SessionStatus.PAYMENT_PENDING,
      expect.anything()
    );
  });

  it("throws when wrong mentor tries to complete", async () => {
    const session = buildSessionRecord({ mentorId: "mt1", status: SessionStatus.CONFIRMED });
    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(session);

    await expect(
      new CompleteSessionUseCase(uow).execute(session.id, "wrong_mentor")
    ).rejects.toThrow("không có quyền");
  });
});

// ─── RateSessionUseCase ───────────────────────────────────────────────────────

describe("RateSessionUseCase", () => {
  it("saves rating for completed session", async () => {
    const session = buildSessionRecord({
      status: SessionStatus.COMPLETED,
      menteeId: "mentee_01",
    });
    const rated = { ...session, rating: 5, ratingComment: "Tuyệt vời!" };

    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(session);
    uow.sessions.addRating.mockResolvedValue(rated as any);

    const result = await new RateSessionUseCase(uow).execute(
      session.id,
      "mentee_01",
      5,
      "Tuyệt vời!"
    );

    expect(result.rating).toBe(5);
    expect(uow.sessions.addRating).toHaveBeenCalledWith(session.id, 5, "Tuyệt vời!");
  });

  it("throws for rating out of range", async () => {
    const uow = createMockUnitOfWork();
    await expect(
      new RateSessionUseCase(uow).execute("s1", "m1", 6)
    ).rejects.toThrow("1-5 sao");

    await expect(
      new RateSessionUseCase(uow).execute("s1", "m1", 0)
    ).rejects.toThrow("1-5 sao");
  });

  it("throws when session is not completed", async () => {
    const session = buildSessionRecord({
      status: SessionStatus.CONFIRMED,
      menteeId: "m1",
    });
    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(session);

    await expect(
      new RateSessionUseCase(uow).execute(session.id, "m1", 4)
    ).rejects.toThrow("Chỉ có thể đánh giá");
  });

  it("throws when wrong mentee tries to rate", async () => {
    const session = buildSessionRecord({
      status: SessionStatus.COMPLETED,
      menteeId: "correct_mentee",
    });
    const uow = createMockUnitOfWork();
    uow.sessions.findById.mockResolvedValue(session);

    await expect(
      new RateSessionUseCase(uow).execute(session.id, "wrong_mentee", 4)
    ).rejects.toThrow("Không có quyền");
  });
});

// ─── GetLeaderboardUseCase ────────────────────────────────────────────────────

describe("GetLeaderboardUseCase", () => {
  it("returns top mentors and mentees for specified month/year", async () => {
    const uow = createMockUnitOfWork();
    const topMentors = [
      { userId: "m1", name: "Mentor A", image: null, sessionCount: 10, totalAmount: 1000000 },
    ];
    const topMentees = [
      { userId: "me1", name: "Mentee A", image: null, sessionCount: 5, totalAmount: 500000 },
    ];

    uow.sessions.getTopMentors.mockResolvedValue(topMentors);
    uow.sessions.getTopMentees.mockResolvedValue(topMentees);

    const result = await new GetLeaderboardUseCase(uow).execute(3, 2025);

    expect(result.topMentors).toHaveLength(1);
    expect(result.topMentees).toHaveLength(1);
    expect(result.month).toBe(3);
    expect(result.year).toBe(2025);
    expect(uow.sessions.getTopMentors).toHaveBeenCalledWith(3, 2025, 10);
  });

  it("uses current month/year when not specified", async () => {
    const now = new Date();
    const uow = createMockUnitOfWork();
    uow.sessions.getTopMentors.mockResolvedValue([]);
    uow.sessions.getTopMentees.mockResolvedValue([]);

    const result = await new GetLeaderboardUseCase(uow).execute();

    expect(result.month).toBe(now.getMonth() + 1);
    expect(result.year).toBe(now.getFullYear());
  });
});
