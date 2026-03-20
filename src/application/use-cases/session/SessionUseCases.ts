import { IUnitOfWork } from "../../interfaces/IUnitOfWork";
import { SessionStatus } from "../../../domain/value-objects/Payment";
import { UserRole } from "../../../domain/value-objects/UserRole";
import { UserStatus } from "../../../domain/value-objects/UserStatus";
import { meetService } from "../../../infrastructure/external/GoogleMeetService";
import { BookSessionInput, SessionRecord, LeaderboardEntry } from "../../../domain/repositories/ISessionRepository";

// ─── BookSessionUseCase ────────────────────────────────────────────────────────
// Mentee đặt lịch học với Mentor

export interface BookSessionDTO {
  menteeId: string;
  mentorId: string;
  teachingFieldId?: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  durationMinutes?: number;
  notes?: string;
}

export class BookSessionUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: BookSessionDTO): Promise<SessionRecord> {
    return this.uow.execute(async (uow) => {
      // 1. Kiểm tra mentee tồn tại và đã kích hoạt
      const mentee = await uow.users.findById(input.menteeId);
      if (!mentee) throw new Error("Không tìm thấy người học");
      if (mentee.status !== UserStatus.ACTIVE) {
        throw new Error(
          "Tài khoản chưa được kích hoạt. Vui lòng hoàn thành kích hoạt trước khi đặt lịch."
        );
      }

      // 2. Kiểm tra không còn nợ học phí
      const pendingPaymentSession = await uow.sessions.findPendingPaymentByMenteeId(
        input.menteeId
      );
      if (pendingPaymentSession) {
        throw new Error(
          "Bạn còn buổi học chưa thanh toán học phí. Vui lòng hoàn tất thanh toán trước khi đặt lịch mới."
        );
      }

      // 3. Kiểm tra mentor
      const mentor = await uow.users.findById(input.mentorId);
      if (!mentor) throw new Error("Không tìm thấy Mentor");
      if (!mentor.isMentor() && !mentor.isAdmin()) {
        throw new Error("Người được chọn không phải là Mentor");
      }

      // 4. Lấy fee của mentor
      const fee = 0; // Sẽ lấy từ MentorProfile trong implementation thực tế

      // 5. Tạo session
      const sessionId = `sess_${Date.now()}`;
      const session = await uow.sessions.create({
        id: sessionId,
        menteeId: input.menteeId,
        mentorId: input.mentorId,
        teachingFieldId: input.teachingFieldId,
        title: input.title,
        description: input.description,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes ?? 60,
        fee,
        notes: input.notes,
        createdBy: input.menteeId,
      });

      await uow.users.createAuditLog({
        userId: input.menteeId,
        action: "SESSION_BOOKED",
        newValues: {
          sessionId: session.id,
          mentorId: input.mentorId,
          scheduledAt: input.scheduledAt,
        },
        performedBy: input.menteeId,
      });

      return session;
    });
  }
}

// ─── ConfirmSessionUseCase ─────────────────────────────────────────────────────
// Mentor xác nhận buổi học và tạo link Google Meet

export class ConfirmSessionUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(sessionId: string, mentorId: string): Promise<SessionRecord> {
    return this.uow.execute(async (uow) => {
      const session = await uow.sessions.findById(sessionId);
      if (!session) throw new Error("Không tìm thấy buổi học");

      if (session.mentorId !== mentorId) {
        throw new Error("Bạn không có quyền xác nhận buổi học này");
      }

      if (session.status !== SessionStatus.PENDING) {
        throw new Error("Buổi học không trong trạng thái chờ xác nhận");
      }

      // Tạo Google Meet link
      const { meetLink, meetId } = await meetService.createMeetLink(sessionId);

      return uow.sessions.updateStatus(sessionId, SessionStatus.CONFIRMED, {
        meetLink,
        meetId,
      });
    });
  }
}

// ─── CancelSessionUseCase ──────────────────────────────────────────────────────

export class CancelSessionUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    sessionId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<SessionRecord> {
    const session = await this.uow.sessions.findById(sessionId);
    if (!session) throw new Error("Không tìm thấy buổi học");

    const isMentee = session.menteeId === cancelledBy;
    const isMentor = session.mentorId === cancelledBy;

    if (!isMentee && !isMentor) {
      throw new Error("Bạn không có quyền huỷ buổi học này");
    }

    if (
      session.status === SessionStatus.COMPLETED ||
      session.status === SessionStatus.CANCELLED
    ) {
      throw new Error("Không thể huỷ buổi học đã hoàn thành hoặc đã bị huỷ");
    }

    return this.uow.sessions.updateStatus(sessionId, SessionStatus.CANCELLED, {
      cancelReason: reason,
      cancelledBy,
    });
  }
}

// ─── CompleteSessionUseCase ────────────────────────────────────────────────────
// Mentor đánh dấu buổi học hoàn thành, Mentee cần thanh toán nếu có phí

export class CompleteSessionUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(sessionId: string, mentorId: string, mentorNotes?: string): Promise<SessionRecord> {
    const session = await this.uow.sessions.findById(sessionId);
    if (!session) throw new Error("Không tìm thấy buổi học");

    if (session.mentorId !== mentorId) {
      throw new Error("Bạn không có quyền cập nhật buổi học này");
    }

    if (
      session.status !== SessionStatus.CONFIRMED &&
      session.status !== SessionStatus.IN_PROGRESS
    ) {
      throw new Error("Buổi học chưa được xác nhận");
    }

    // Nếu có học phí → chuyển sang PAYMENT_PENDING
    const newStatus =
      session.fee > 0 ? SessionStatus.PAYMENT_PENDING : SessionStatus.COMPLETED;

    return this.uow.sessions.updateStatus(sessionId, newStatus, { mentorNotes });
  }
}

// ─── RateSessionUseCase ────────────────────────────────────────────────────────

export class RateSessionUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    sessionId: string,
    menteeId: string,
    rating: number,
    comment?: string
  ): Promise<SessionRecord> {
    if (rating < 1 || rating > 5) throw new Error("Đánh giá phải từ 1-5 sao");

    const session = await this.uow.sessions.findById(sessionId);
    if (!session) throw new Error("Không tìm thấy buổi học");
    if (session.menteeId !== menteeId) throw new Error("Không có quyền đánh giá");
    if (session.status !== SessionStatus.COMPLETED) {
      throw new Error("Chỉ có thể đánh giá buổi học đã hoàn thành");
    }

    return this.uow.sessions.addRating(sessionId, rating, comment);
  }
}

// ─── ApplyForMentorUseCase ─────────────────────────────────────────────────────
// Mentee đăng ký trở thành Mentor

export interface ApplyForMentorDTO {
  userId: string;
  motivation: string;
  experience: string;
  linkedinUrl?: string;
}

export class ApplyForMentorUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: ApplyForMentorDTO): Promise<{ applicationId: string }> {
    const user = await this.uow.users.findById(input.userId);
    if (!user) throw new Error("Không tìm thấy người dùng");

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error("Tài khoản chưa được kích hoạt");
    }

    if (user.isMentor()) {
      throw new Error("Bạn đã là Mentor rồi");
    }

    // Kiểm tra application đang pending
    // (simplified: assume no duplicate check here — handled at DB level)

    // Trong thực tế: insert MentorApplication record
    // Hiện tại trả về mock id
    await this.uow.users.createAuditLog({
      userId: input.userId,
      action: "MENTOR_APPLICATION_SUBMITTED",
      newValues: { motivation: input.motivation },
      performedBy: input.userId,
    });

    return { applicationId: `app_${Date.now()}` };
  }
}

// ─── GetLeaderboardUseCase ─────────────────────────────────────────────────────

export interface LeaderboardDTO {
  topMentors: LeaderboardEntry[];
  topMentees: LeaderboardEntry[];
  month: number;
  year: number;
}

export class GetLeaderboardUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(month?: number, year?: number): Promise<LeaderboardDTO> {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    const [topMentors, topMentees] = await Promise.all([
      this.uow.sessions.getTopMentors(m, y, 10),
      this.uow.sessions.getTopMentees(m, y, 10),
    ]);

    return { topMentors, topMentees, month: m, year: y };
  }
}

// ─── GetMentorScheduleUseCase ─────────────────────────────────────────────────

export class GetMentorSessionsUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async byMentorId(mentorId: string): Promise<SessionRecord[]> {
    return this.uow.sessions.findByMentorId(mentorId);
  }

  async byMenteeId(menteeId: string): Promise<SessionRecord[]> {
    return this.uow.sessions.findByMenteeId(menteeId);
  }

  async upcomingByMentorId(mentorId: string): Promise<SessionRecord[]> {
    return this.uow.sessions.findUpcomingByMentorId(mentorId);
  }
}
