const { createId } = require("@paralleldrive/cuid2");
import { IUnitOfWork } from "../../interfaces/IUnitOfWork";
import { ReportRecord } from "../../../domain/repositories/IReportRepository";
import { SessionStatus } from "../../../domain/value-objects/Payment";

// ─── SubmitReportUseCase ──────────────────────────────────────────────────────

export interface SubmitReportDTO {
  reporterId: string;
  reportedUserId: string;
  sessionId?: string;
  reason: string;
  description: string;
}

export class SubmitReportUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: SubmitReportDTO): Promise<ReportRecord> {
    if (!input.description || input.description.trim().length < 20) {
      throw new Error("Mô tả báo cáo phải có ít nhất 20 ký tự");
    }

    return this.uow.execute(async (uow) => {
      const reporter = await uow.users.findById(input.reporterId);
      if (!reporter) throw new Error("Không tìm thấy người dùng");

      const reported = await uow.users.findById(input.reportedUserId);
      if (!reported) throw new Error("Không tìm thấy người dùng bị báo cáo");

      // Nếu có sessionId, validate session liên quan đến reporter
      if (input.sessionId) {
        const session = await uow.sessions.findById(input.sessionId);
        if (!session) throw new Error("Không tìm thấy buổi học");
        if (
          session.menteeId !== input.reporterId &&
          session.mentorId !== input.reporterId
        ) {
          throw new Error("Bạn không có quyền báo cáo buổi học này");
        }
        // Chỉ báo cáo sau khi buổi học đã kết thúc
        if (
          session.status === SessionStatus.PENDING ||
          session.status === SessionStatus.CONFIRMED
        ) {
          throw new Error("Chỉ có thể báo cáo sau khi buổi học kết thúc");
        }
      }

      const report = await uow.reports.create({
        id: createId(),
        reporterId: input.reporterId,
        reportedUserId: input.reportedUserId,
        sessionId: input.sessionId,
        reason: input.reason,
        description: input.description,
      });

      await uow.users.createAuditLog({
        userId: input.reporterId,
        action: "REPORT_SUBMITTED",
        newValues: { reportId: report.id, reason: input.reason, reportedUserId: input.reportedUserId },
        performedBy: input.reporterId,
      });

      return report;
    });
  }
}

// ─── ListReportsUseCase ───────────────────────────────────────────────────────

export class ListReportsUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(options?: { status?: string; page?: number; pageSize?: number }) {
    return this.uow.reports.findAll(options);
  }
}

// ─── ResolveReportUseCase ─────────────────────────────────────────────────────

export class ResolveReportUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    reportId: string,
    status: "REVIEWED" | "RESOLVED" | "DISMISSED",
    reviewedBy: string,
    reviewNote: string
  ): Promise<ReportRecord> {
    if (!reviewNote?.trim()) {
      throw new Error("Vui lòng nhập ghi chú xử lý");
    }

    return this.uow.execute(async (uow) => {
      const report = await uow.reports.findById(reportId);
      if (!report) throw new Error("Không tìm thấy báo cáo");

      const updated = await uow.reports.updateStatus(reportId, status, reviewedBy, reviewNote);

      await uow.users.createAuditLog({
        userId: reviewedBy,
        action: "REPORT_RESOLVED",
        newValues: { reportId, status, reviewNote },
        performedBy: reviewedBy,
      });

      return updated;
    });
  }
}
