import {
  SubmitReportUseCase,
  ListReportsUseCase,
  ResolveReportUseCase,
} from "@/application/use-cases/report/ReportUseCases";
import { createMockUnitOfWork, buildUser, buildSessionRecord } from "@/__tests__/helpers";
import { ReportRecord } from "@/domain/repositories/IReportRepository";
import { SessionStatus } from "@/domain/value-objects/Payment";

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const buildReportRecord = (overrides: Partial<ReportRecord> = {}): ReportRecord => ({
  id: "report_001",
  reporterId: "mentee_001",
  reportedUserId: "mentor_001",
  sessionId: null,
  reason: "Hành vi không phù hợp",
  description: "Mentor có thái độ thiếu tôn trọng trong buổi học và không chuẩn bị tài liệu.",
  status: "PENDING",
  reviewedBy: null,
  reviewNote: null,
  reviewedAt: null,
  createdAt: new Date("2025-01-01T10:00:00Z"),
  updatedAt: new Date("2025-01-01T10:00:00Z"),
  ...overrides,
});

// ─── SubmitReportUseCase ───────────────────────────────────────────────────────

describe("SubmitReportUseCase", () => {
  let useCase: SubmitReportUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
    useCase = new SubmitReportUseCase(uow);
  });

  it("should submit report successfully without sessionId", async () => {
    const reporter = buildUser({ id: "mentee_001", email: "mentee@example.com" });
    const reported = buildUser({ id: "mentor_001", email: "mentor@example.com" });
    uow.users.findById.mockResolvedValueOnce(reporter).mockResolvedValueOnce(reported);
    uow.reports.create.mockResolvedValue(buildReportRecord());

    const result = await useCase.execute({
      reporterId: "mentee_001",
      reportedUserId: "mentor_001",
      reason: "Hành vi không phù hợp",
      description: "Mentor có thái độ thiếu tôn trọng trong buổi học và không chuẩn bị tài liệu.",
    });

    expect(result.id).toBe("report_001");
    expect(uow.reports.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterId: "mentee_001",
        reportedUserId: "mentor_001",
        reason: "Hành vi không phù hợp",
      })
    );
  });

  it("should throw error if description is too short (< 20 chars)", async () => {
    await expect(
      useCase.execute({
        reporterId: "mentee_001",
        reportedUserId: "mentor_001",
        reason: "Spam",
        description: "Ngắn quá",
      })
    ).rejects.toThrow("20 ký tự");
  });

  it("should throw error if description is empty", async () => {
    await expect(
      useCase.execute({
        reporterId: "mentee_001",
        reportedUserId: "mentor_001",
        reason: "Spam",
        description: "",
      })
    ).rejects.toThrow("20 ký tự");
  });

  it("should throw error if reporter not found", async () => {
    uow.users.findById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        reporterId: "unknown_user",
        reportedUserId: "mentor_001",
        reason: "Spam",
        description: "Đây là mô tả báo cáo chi tiết ít nhất 20 ký tự.",
      })
    ).rejects.toThrow("Không tìm thấy người dùng");
  });

  it("should throw error if reported user not found", async () => {
    const reporter = buildUser({ id: "mentee_001" });
    uow.users.findById.mockResolvedValueOnce(reporter).mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        reporterId: "mentee_001",
        reportedUserId: "unknown_mentor",
        reason: "Spam",
        description: "Đây là mô tả báo cáo chi tiết ít nhất 20 ký tự.",
      })
    ).rejects.toThrow("Không tìm thấy người dùng bị báo cáo");
  });

  it("should submit report with valid sessionId", async () => {
    const reporter = buildUser({ id: "mentee_001" });
    const reported = buildUser({ id: "mentor_001" });
    const session = buildSessionRecord({
      id: "sess_001",
      menteeId: "mentee_001",
      mentorId: "mentor_001",
      status: SessionStatus.COMPLETED,
    });

    uow.users.findById.mockResolvedValueOnce(reporter).mockResolvedValueOnce(reported);
    uow.sessions.findById.mockResolvedValue(session);
    uow.reports.create.mockResolvedValue(buildReportRecord({ sessionId: "sess_001" }));

    const result = await useCase.execute({
      reporterId: "mentee_001",
      reportedUserId: "mentor_001",
      sessionId: "sess_001",
      reason: "Hành vi không phù hợp",
      description: "Mentor có thái độ thiếu tôn trọng trong buổi học và không chuẩn bị tài liệu.",
    });

    expect(result.sessionId).toBe("sess_001");
  });

  it("should throw error if session not found", async () => {
    const reporter = buildUser({ id: "mentee_001" });
    const reported = buildUser({ id: "mentor_001" });
    uow.users.findById.mockResolvedValueOnce(reporter).mockResolvedValueOnce(reported);
    uow.sessions.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        reporterId: "mentee_001",
        reportedUserId: "mentor_001",
        sessionId: "unknown_sess",
        reason: "Hành vi không phù hợp",
        description: "Mô tả báo cáo chi tiết hơn 20 ký tự.",
      })
    ).rejects.toThrow("Không tìm thấy buổi học");
  });

  it("should throw error if reporter is not part of the session", async () => {
    const reporter = buildUser({ id: "other_user" });
    const reported = buildUser({ id: "mentor_001" });
    const session = buildSessionRecord({
      menteeId: "mentee_001",
      mentorId: "mentor_001",
      status: SessionStatus.COMPLETED,
    });

    uow.users.findById.mockResolvedValueOnce(reporter).mockResolvedValueOnce(reported);
    uow.sessions.findById.mockResolvedValue(session);

    await expect(
      useCase.execute({
        reporterId: "other_user",
        reportedUserId: "mentor_001",
        sessionId: "sess_001",
        reason: "Spam",
        description: "Đây là mô tả báo cáo chi tiết ít nhất 20 ký tự.",
      })
    ).rejects.toThrow("không có quyền báo cáo");
  });

  it("should throw error if session is still PENDING (not ended)", async () => {
    const reporter = buildUser({ id: "mentee_001" });
    const reported = buildUser({ id: "mentor_001" });
    const session = buildSessionRecord({
      menteeId: "mentee_001",
      mentorId: "mentor_001",
      status: SessionStatus.PENDING,
    });

    uow.users.findById.mockResolvedValueOnce(reporter).mockResolvedValueOnce(reported);
    uow.sessions.findById.mockResolvedValue(session);

    await expect(
      useCase.execute({
        reporterId: "mentee_001",
        reportedUserId: "mentor_001",
        sessionId: "sess_001",
        reason: "Hành vi không phù hợp",
        description: "Mô tả báo cáo chi tiết hơn 20 ký tự rồi.",
      })
    ).rejects.toThrow("sau khi buổi học kết thúc");
  });

  it("should throw error if session is CONFIRMED (not ended)", async () => {
    const reporter = buildUser({ id: "mentee_001" });
    const reported = buildUser({ id: "mentor_001" });
    const session = buildSessionRecord({
      menteeId: "mentee_001",
      mentorId: "mentor_001",
      status: SessionStatus.CONFIRMED,
    });

    uow.users.findById.mockResolvedValueOnce(reporter).mockResolvedValueOnce(reported);
    uow.sessions.findById.mockResolvedValue(session);

    await expect(
      useCase.execute({
        reporterId: "mentee_001",
        reportedUserId: "mentor_001",
        sessionId: "sess_001",
        reason: "Hành vi không phù hợp",
        description: "Mô tả báo cáo chi tiết hơn 20 ký tự rồi.",
      })
    ).rejects.toThrow("sau khi buổi học kết thúc");
  });

  it("should allow mentor to report mentee for a completed session", async () => {
    const mentor = buildUser({ id: "mentor_001" });
    const mentee = buildUser({ id: "mentee_001" });
    const session = buildSessionRecord({
      menteeId: "mentee_001",
      mentorId: "mentor_001",
      status: SessionStatus.COMPLETED,
    });

    uow.users.findById.mockResolvedValueOnce(mentor).mockResolvedValueOnce(mentee);
    uow.sessions.findById.mockResolvedValue(session);
    uow.reports.create.mockResolvedValue(
      buildReportRecord({ reporterId: "mentor_001", reportedUserId: "mentee_001" })
    );

    const result = await useCase.execute({
      reporterId: "mentor_001",
      reportedUserId: "mentee_001",
      sessionId: "sess_001",
      reason: "Không hiện diện",
      description: "Mentee vắng mặt không báo trước trong buổi học đã xác nhận.",
    });

    expect(result.reporterId).toBe("mentor_001");
  });

  it("should create audit log after successful submission", async () => {
    const reporter = buildUser({ id: "mentee_001" });
    const reported = buildUser({ id: "mentor_001" });
    uow.users.findById.mockResolvedValueOnce(reporter).mockResolvedValueOnce(reported);
    uow.reports.create.mockResolvedValue(buildReportRecord());

    await useCase.execute({
      reporterId: "mentee_001",
      reportedUserId: "mentor_001",
      reason: "Hành vi không phù hợp",
      description: "Mentor có thái độ thiếu tôn trọng trong buổi học.",
    });

    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "REPORT_SUBMITTED",
        performedBy: "mentee_001",
        newValues: expect.objectContaining({
          reason: "Hành vi không phù hợp",
          reportedUserId: "mentor_001",
        }),
      })
    );
  });
});

// ─── ListReportsUseCase ───────────────────────────────────────────────────────

describe("ListReportsUseCase", () => {
  let useCase: ListReportsUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
    useCase = new ListReportsUseCase(uow);
  });

  it("should return all reports when no options provided", async () => {
    const reports = [buildReportRecord(), buildReportRecord({ id: "report_002" })];
    uow.reports.findAll.mockResolvedValue(reports);

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(uow.reports.findAll).toHaveBeenCalledWith(undefined);
  });

  it("should filter by status when provided", async () => {
    uow.reports.findAll.mockResolvedValue([buildReportRecord({ status: "PENDING" })]);

    await useCase.execute({ status: "PENDING" });

    expect(uow.reports.findAll).toHaveBeenCalledWith({ status: "PENDING" });
  });

  it("should pass pagination options", async () => {
    uow.reports.findAll.mockResolvedValue([]);

    await useCase.execute({ page: 2, pageSize: 10 });

    expect(uow.reports.findAll).toHaveBeenCalledWith({ page: 2, pageSize: 10 });
  });

  it("should return empty array when no reports", async () => {
    uow.reports.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it("should pass combined filter + pagination options", async () => {
    uow.reports.findAll.mockResolvedValue([]);

    await useCase.execute({ status: "RESOLVED", page: 1, pageSize: 20 });

    expect(uow.reports.findAll).toHaveBeenCalledWith({ status: "RESOLVED", page: 1, pageSize: 20 });
  });
});

// ─── ResolveReportUseCase ─────────────────────────────────────────────────────

describe("ResolveReportUseCase", () => {
  let useCase: ResolveReportUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
    useCase = new ResolveReportUseCase(uow);
  });

  it("should resolve report successfully", async () => {
    uow.reports.findById.mockResolvedValue(buildReportRecord());
    uow.reports.updateStatus.mockResolvedValue(
      buildReportRecord({ status: "RESOLVED", reviewedBy: "admin_001", reviewNote: "Đã xử lý xong" })
    );

    const result = await useCase.execute("report_001", "RESOLVED", "admin_001", "Đã xử lý xong");

    expect(result.status).toBe("RESOLVED");
    expect(uow.reports.updateStatus).toHaveBeenCalledWith("report_001", "RESOLVED", "admin_001", "Đã xử lý xong");
  });

  it("should dismiss report successfully", async () => {
    uow.reports.findById.mockResolvedValue(buildReportRecord());
    uow.reports.updateStatus.mockResolvedValue(
      buildReportRecord({ status: "DISMISSED", reviewedBy: "admin_001", reviewNote: "Không có căn cứ" })
    );

    const result = await useCase.execute("report_001", "DISMISSED", "admin_001", "Không có căn cứ");

    expect(result.status).toBe("DISMISSED");
  });

  it("should mark report as REVIEWED", async () => {
    uow.reports.findById.mockResolvedValue(buildReportRecord());
    uow.reports.updateStatus.mockResolvedValue(
      buildReportRecord({ status: "REVIEWED", reviewedBy: "admin_001", reviewNote: "Đang xem xét" })
    );

    const result = await useCase.execute("report_001", "REVIEWED", "admin_001", "Đang xem xét");

    expect(result.status).toBe("REVIEWED");
  });

  it("should throw error if review note is empty", async () => {
    await expect(
      useCase.execute("report_001", "RESOLVED", "admin_001", "")
    ).rejects.toThrow("ghi chú xử lý");
  });

  it("should throw error if review note is only whitespace", async () => {
    await expect(
      useCase.execute("report_001", "RESOLVED", "admin_001", "   ")
    ).rejects.toThrow("ghi chú xử lý");
  });

  it("should throw error if report not found", async () => {
    uow.reports.findById.mockResolvedValue(null);

    await expect(
      useCase.execute("unknown_report", "RESOLVED", "admin_001", "Ghi chú xử lý hợp lệ")
    ).rejects.toThrow("Không tìm thấy báo cáo");
  });

  it("should create audit log after successful resolution", async () => {
    uow.reports.findById.mockResolvedValue(buildReportRecord());
    uow.reports.updateStatus.mockResolvedValue(
      buildReportRecord({ status: "RESOLVED", reviewedBy: "admin_001", reviewNote: "Đã xử lý" })
    );

    await useCase.execute("report_001", "RESOLVED", "admin_001", "Đã xử lý");

    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "REPORT_RESOLVED",
        performedBy: "admin_001",
        newValues: expect.objectContaining({
          reportId: "report_001",
          status: "RESOLVED",
          reviewNote: "Đã xử lý",
        }),
      })
    );
  });

  it("should create audit log with correct values for DISMISSED", async () => {
    uow.reports.findById.mockResolvedValue(buildReportRecord());
    uow.reports.updateStatus.mockResolvedValue(
      buildReportRecord({ status: "DISMISSED", reviewedBy: "admin_001", reviewNote: "Báo cáo sai sự thật" })
    );

    await useCase.execute("report_001", "DISMISSED", "admin_001", "Báo cáo sai sự thật");

    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "REPORT_RESOLVED",
        performedBy: "admin_001",
        newValues: expect.objectContaining({
          status: "DISMISSED",
          reviewNote: "Báo cáo sai sự thật",
        }),
      })
    );
  });
});
