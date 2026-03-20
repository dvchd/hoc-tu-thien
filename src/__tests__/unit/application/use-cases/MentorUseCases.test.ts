import {
  ApplyForMentorUseCase,
  GetMentorSessionsUseCase,
} from "@/application/use-cases/session/SessionUseCases";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { UserRole } from "@/domain/value-objects/UserRole";
import {
  buildUser,
  buildMentor,
  buildSessionRecord,
  createMockUnitOfWork,
} from "@/__tests__/helpers";
import { SessionStatus } from "@/domain/value-objects/Payment";

// ─── ApplyForMentorUseCase ────────────────────────────────────────────────────

describe("ApplyForMentorUseCase", () => {
  it("creates an application for an active MENTEE", async () => {
    const mentee = buildUser({
      id: "m1",
      status: UserStatus.ACTIVE,
      role: UserRole.MENTEE,
    });

    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(mentee);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const result = await new ApplyForMentorUseCase(uow).execute({
      userId: "m1",
      motivation: "Tôi muốn chia sẻ kiến thức về ReactJS với cộng đồng.",
      experience: "5 năm làm Frontend Developer tại các startup.",
    });

    expect(result.applicationId).toBeDefined();
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MENTOR_APPLICATION_SUBMITTED" })
    );
  });

  it("throws when user account is not active", async () => {
    const inactive = buildUser({
      id: "m2",
      status: UserStatus.PENDING_ACTIVATION,
    });
    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(inactive);

    await expect(
      new ApplyForMentorUseCase(uow).execute({
        userId: "m2",
        motivation: "Muốn làm mentor.",
        experience: "3 năm kinh nghiệm.",
      })
    ).rejects.toThrow("Tài khoản chưa được kích hoạt");
  });

  it("throws when user is already a MENTOR", async () => {
    const mentor = buildMentor();
    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(mentor);

    await expect(
      new ApplyForMentorUseCase(uow).execute({
        userId: mentor.id,
        motivation: "Apply again",
        experience: "Already mentor.",
      })
    ).rejects.toThrow("Bạn đã là Mentor rồi");
  });

  it("throws when user not found", async () => {
    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(null);

    await expect(
      new ApplyForMentorUseCase(uow).execute({
        userId: "ghost",
        motivation: "...",
        experience: "...",
      })
    ).rejects.toThrow("Không tìm thấy người dùng");
  });
});

// ─── GetMentorSessionsUseCase ─────────────────────────────────────────────────

describe("GetMentorSessionsUseCase", () => {
  it("byMentorId returns sessions for the mentor", async () => {
    const sessions = [
      buildSessionRecord({ id: "s1", mentorId: "mt1" }),
      buildSessionRecord({ id: "s2", mentorId: "mt1", status: SessionStatus.COMPLETED }),
    ];

    const uow = createMockUnitOfWork();
    uow.sessions.findByMentorId.mockResolvedValue(sessions);

    const result = await new GetMentorSessionsUseCase(uow).byMentorId("mt1");

    expect(result).toHaveLength(2);
    expect(uow.sessions.findByMentorId).toHaveBeenCalledWith("mt1");
  });

  it("byMenteeId returns sessions for the mentee", async () => {
    const sessions = [buildSessionRecord({ id: "s3", menteeId: "me1" })];

    const uow = createMockUnitOfWork();
    uow.sessions.findByMenteeId.mockResolvedValue(sessions);

    const result = await new GetMentorSessionsUseCase(uow).byMenteeId("me1");

    expect(result).toHaveLength(1);
    expect(uow.sessions.findByMenteeId).toHaveBeenCalledWith("me1");
  });

  it("upcomingByMentorId returns only future confirmed sessions", async () => {
    const upcoming = [
      buildSessionRecord({
        id: "s4",
        mentorId: "mt1",
        status: SessionStatus.CONFIRMED,
        scheduledAt: new Date(Date.now() + 86400000),
      }),
    ];

    const uow = createMockUnitOfWork();
    uow.sessions.findUpcomingByMentorId.mockResolvedValue(upcoming);

    const result = await new GetMentorSessionsUseCase(uow).upcomingByMentorId("mt1");

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe(SessionStatus.CONFIRMED);
    expect(uow.sessions.findUpcomingByMentorId).toHaveBeenCalledWith("mt1");
  });

  it("returns empty array when no sessions found", async () => {
    const uow = createMockUnitOfWork();
    uow.sessions.findByMenteeId.mockResolvedValue([]);

    const result = await new GetMentorSessionsUseCase(uow).byMenteeId("nobody");
    expect(result).toEqual([]);
  });
});
