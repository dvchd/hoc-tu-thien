// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createId } = require("@paralleldrive/cuid2");
import { IUnitOfWork } from "../../interfaces/IUnitOfWork";
import { UserStatus } from "../../../domain/value-objects/UserStatus";
import { UserRole } from "../../../domain/value-objects/UserRole";
import { MentorApplicationRecord } from "../../../domain/repositories/IMentorApplicationRepository";

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface SubmitMentorApplicationDTO {
  userId: string;
  motivation: string;
  experience: string;
  linkedinUrl?: string;
  contactInfo?: {
    zalo?: string;
    facebook?: string;
    email?: string;
  };
}

// ─── SubmitMentorApplicationUseCase ───────────────────────────────────────────

export class SubmitMentorApplicationUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: SubmitMentorApplicationDTO): Promise<MentorApplicationRecord> {
    const user = await this.uow.users.findById(input.userId);
    if (!user) throw new Error("Không tìm thấy người dùng");

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error("Tài khoản chưa được kích hoạt. Vui lòng kích hoạt trước khi đăng ký làm Mentor.");
    }

    if (user.isMentor()) {
      throw new Error("Bạn đã là Mentor rồi");
    }

    if (user.isAdmin()) {
      throw new Error("Admin không thể đăng ký làm Mentor");
    }

    // Kiểm tra đã có application pending/approved chưa
    const existing = await this.uow.mentorApplications.findByUserId(input.userId);
    if (existing) {
      if (existing.status === "PENDING") {
        throw new Error("Bạn đã có đơn đăng ký đang chờ xét duyệt. Vui lòng đợi Admin xem xét.");
      }
      if (existing.status === "APPROVED") {
        throw new Error("Đơn đăng ký của bạn đã được phê duyệt trước đó.");
      }
      // Nếu REJECTED -> cho phép nộp lại (tạo bản ghi mới không được vì unique constraint)
      // Xử lý bằng cách không cho nộp lại khi REJECTED - yêu cầu contact admin
      throw new Error("Đơn đăng ký trước đây của bạn đã bị từ chối. Vui lòng liên hệ Admin để được hỗ trợ.");
    }

    const contactInfoStr = input.contactInfo
      ? JSON.stringify(input.contactInfo)
      : null;

    const application = await this.uow.mentorApplications.create({
      id: createId(),
      userId: input.userId,
      motivation: input.motivation,
      experience: input.experience,
      linkedinUrl: input.linkedinUrl,
      contactInfo: contactInfoStr ?? undefined,
    });

    await this.uow.users.createAuditLog({
      userId: input.userId,
      action: "MENTOR_APPLICATION_SUBMITTED",
      newValues: { applicationId: application.id, motivation: input.motivation.slice(0, 100) },
      performedBy: input.userId,
    });

    return application;
  }
}

// ─── ListMentorApplicationsUseCase ────────────────────────────────────────────

export class ListMentorApplicationsUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(options?: { status?: string; page?: number; pageSize?: number }) {
    return this.uow.mentorApplications.findAll(options);
  }
}

// ─── ApproveMentorApplicationUseCase ──────────────────────────────────────────

export class ApproveMentorApplicationUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    applicationId: string,
    reviewedBy: string,
    reviewNote?: string
  ): Promise<MentorApplicationRecord> {
    return this.uow.execute(async (uow) => {
      const application = await uow.mentorApplications.findById(applicationId);
      if (!application) throw new Error("Không tìm thấy đơn đăng ký");
      if (application.status !== "PENDING") {
        throw new Error(`Đơn đăng ký đã ở trạng thái: ${application.status}`);
      }

      // 1. Phê duyệt application
      const updated = await uow.mentorApplications.updateStatus(
        applicationId,
        "APPROVED",
        reviewedBy,
        reviewNote
      );

      // 2. Nâng role người dùng lên MENTOR
      const user = await uow.users.findById(application.userId);
      if (!user) throw new Error("Không tìm thấy người dùng");

      const promoted = user.promoteToMentor(reviewedBy);
      await uow.users.update(promoted);

      // 3. Tạo MentorProfile nếu chưa có
      // (dùng prisma trực tiếp qua prisma client - simplified via raw upsert)
      // Lưu ý: MentorProfile tạo bằng cách gọi API riêng sau khi được approve
      // Ở đây chỉ set role, profile sẽ được mentor tự setup sau

      await uow.users.createAuditLog({
        userId: application.userId,
        action: "MENTOR_APPLICATION_APPROVED",
        newValues: { applicationId, reviewedBy, newRole: UserRole.MENTOR },
        performedBy: reviewedBy,
      });

      return updated;
    });
  }
}

// ─── RejectMentorApplicationUseCase ───────────────────────────────────────────

export class RejectMentorApplicationUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    applicationId: string,
    reviewedBy: string,
    reviewNote: string
  ): Promise<MentorApplicationRecord> {
    if (!reviewNote?.trim()) {
      throw new Error("Vui lòng nhập lý do từ chối");
    }

    const application = await this.uow.mentorApplications.findById(applicationId);
    if (!application) throw new Error("Không tìm thấy đơn đăng ký");
    if (application.status !== "PENDING") {
      throw new Error(`Đơn đăng ký đã ở trạng thái: ${application.status}`);
    }

    const updated = await this.uow.mentorApplications.updateStatus(
      applicationId,
      "REJECTED",
      reviewedBy,
      reviewNote
    );

    await this.uow.users.createAuditLog({
      userId: application.userId,
      action: "MENTOR_APPLICATION_REJECTED",
      newValues: { applicationId, reviewedBy, reviewNote },
      performedBy: reviewedBy,
    });

    return updated;
  }
}
