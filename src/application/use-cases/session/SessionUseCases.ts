import { createId } from "@paralleldrive/cuid2";
import { IUnitOfWork } from "../../interfaces/IUnitOfWork";
import {
  SessionStatus,
  LATE_CANCEL_THRESHOLD_MINUTES,
  MIN_ADVANCE_BOOKING_HOURS,
  MAX_ACTIVE_BOOKINGS,
  VALID_DURATION_HOURS,
} from "../../../domain/value-objects/Payment";
import { UserStatus } from "../../../domain/value-objects/UserStatus";
import { SYSTEM_CONFIG_KEYS } from "../../../domain/repositories/ISystemConfigRepository";
import { BookSessionInput, SessionRecord, LeaderboardEntry } from "../../../domain/repositories/ISessionRepository";
import { meetService } from "../../../infrastructure/external/GoogleMeetService";

// ─── BookSessionUseCase ────────────────────────────────────────────────────────

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
      // 1. Validate mentee tồn tại
      const mentee = await uow.users.findById(input.menteeId);
      if (!mentee) throw new Error("Không tìm thấy người học");

      // 7. Validate không có outstanding payment (BR09)
      const pendingPaymentSession = await uow.sessions.findPendingPaymentByMenteeId(input.menteeId);
      if (pendingPaymentSession) {
        throw new Error("Bạn còn buổi học chưa thanh toán học phí");
      }

      // 2. Validate mentor
      const mentor = await uow.users.findById(input.mentorId);
      if (!mentor) throw new Error("Không tìm thấy Mentor");
      if (!mentor.isMentor() && !mentor.isAdmin()) {
        throw new Error("Người được chọn không phải là Mentor");
      }

      // Lấy config từ SystemConfig (với fallback constants)
      const [minAdvanceHours, maxActiveBookings] = await Promise.all([
        uow.systemConfig.getNumber(SYSTEM_CONFIG_KEYS.MIN_BOOKING_ADVANCE_HOURS, MIN_ADVANCE_BOOKING_HOURS),
        uow.systemConfig.getNumber(SYSTEM_CONFIG_KEYS.MAX_ACTIVE_BOOKINGS, MAX_ACTIVE_BOOKINGS),
      ]);

      // 3. Lấy fee của mentor (bao gồm onlyActivatedMentee)
      const mentorProfile = await uow.sessions.getMentorProfileFee(input.mentorId);
      const fee = mentorProfile?.hourlyRate ?? 0;

      // 4. Validate kích hoạt tài khoản (BR03, BR04)
      // BR03: session có phí -> bắt buộc ACTIVE
      // BR04: session miễn phí (fee = 0) -> cho phép cả PENDING_ACTIVATION
      if (fee > 0 && mentee.status !== UserStatus.ACTIVE) {
        throw new Error("Tài khoản chưa được kích hoạt. Vui lòng kích hoạt tài khoản trước khi đặt buổi học có phí.");
      }

      // Check mentor.onlyActivatedMentee (BR06) — type-safe access via MentorProfileFee interface
      if (mentorProfile?.onlyActivatedMentee && mentee.status !== UserStatus.ACTIVE) {
        throw new Error("Mentor này chỉ nhận học viên đã kích hoạt tài khoản.");
      }

      // 6. Validate không có active booking quá giới hạn (BR05)
      const activeCount = await uow.sessions.countActiveByMenteeId(input.menteeId);
      if (activeCount >= maxActiveBookings) {
        throw new Error(
          `Bạn đang có ${activeCount} buổi học đang hoạt động. ` +
          `Vui lòng hoàn thành buổi học hiện tại trước khi đặt thêm.`
        );
      }

      // 8. Validate minimum advance booking (BR10)
      const now = new Date();
      const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000;
      if (input.scheduledAt.getTime() - now.getTime() < minAdvanceMs) {
        throw new Error(
          `Buổi học phải được đặt trước ít nhất ${minAdvanceHours} giờ. ` +
          `Vui lòng chọn thời điểm khác.`
        );
      }

      // 9. Validate duration (BR11) - phải là giờ nguyên
      const durationMinutes = input.durationMinutes ?? 60;
      const durationHours = durationMinutes / 60;
      if (!VALID_DURATION_HOURS.includes(durationHours)) {
        throw new Error(
          `Thời lượng buổi học phải là ${VALID_DURATION_HOURS.join(", ")} giờ. Nhận được: ${durationHours} giờ.`
        );
      }

      // 9b. Validate scheduledAt bắt đầu đúng giờ chẵn (BR11 - top of hour)
      const scheduledDate = new Date(input.scheduledAt);
      if (scheduledDate.getMinutes() !== 0 || scheduledDate.getSeconds() !== 0) {
        throw new Error(
          "Buổi học phải bắt đầu đúng giờ chẵn (VD: 09:00, 14:00, 19:00). " +
          `Nhận được: ${String(scheduledDate.getHours()).padStart(2, "0")}:${String(scheduledDate.getMinutes()).padStart(2, "0")}.`
        );
      }

      // 10. Validate không trùng lịch mentor
      const conflict = await uow.sessions.findConflictingSession(
        input.mentorId,
        input.scheduledAt,
        durationMinutes
      );
      if (conflict) {
        throw new Error("Mentor đã có lịch học vào thời điểm này. Vui lòng chọn thời điểm khác.");
      }

      // 11. Tạo session
      const sessionId = createId();
      const session = await uow.sessions.create({
        id: sessionId,
        menteeId: input.menteeId,
        mentorId: input.mentorId,
        teachingFieldId: input.teachingFieldId,
        title: input.title,
        description: input.description,
        scheduledAt: input.scheduledAt,
        durationMinutes,
        fee,
        notes: input.notes,
        createdBy: input.menteeId,
      });

      await uow.users.createAuditLog({
        userId: input.menteeId,
        action: "SESSION_BOOKED",
        newValues: { sessionId: session.id, mentorId: input.mentorId, scheduledAt: input.scheduledAt, fee },
        performedBy: input.menteeId,
      });

      return session;
    });
  }
}

// ─── ConfirmSessionUseCase ─────────────────────────────────────────────────────

export class ConfirmSessionUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(sessionId: string, mentorId: string, meetLink?: string): Promise<SessionRecord> {
    return this.uow.execute(async (uow) => {
      const session = await uow.sessions.findById(sessionId);
      if (!session) throw new Error("Không tìm thấy buổi học");

      if (session.mentorId !== mentorId) {
        throw new Error("Bạn không có quyền xác nhận buổi học này");
      }

      if (session.status !== SessionStatus.PENDING) {
        throw new Error("Buổi học không trong trạng thái chờ xác nhận");
      }

      // Use GoogleMeetService to generate a proper meet link if none provided
      const finalMeetLink = meetLink ?? (await meetService.createMeetLink(sessionId)).meetLink;

      return uow.sessions.updateStatus(sessionId, SessionStatus.CONFIRMED, {
        meetLink: finalMeetLink,
        meetId: finalMeetLink.split("/").pop() ?? undefined,
      });
    });
  }
}

// ─── CancelSessionUseCase ──────────────────────────────────────────────────────

export class CancelSessionUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(sessionId: string, cancelledBy: string, reason?: string): Promise<SessionRecord> {
    return this.uow.execute(async (uow) => {
      const session = await uow.sessions.findById(sessionId);
      if (!session) throw new Error("Không tìm thấy buổi học");

      const isMentee = session.menteeId === cancelledBy;
      const isMentor = session.mentorId === cancelledBy;

      if (!isMentee && !isMentor) {
        throw new Error("Bạn không có quyền huỷ buổi học này");
      }

      if (
        session.status === SessionStatus.COMPLETED ||
        session.status === SessionStatus.CANCELLED ||
        session.status === SessionStatus.NO_SHOW ||
        session.status === SessionStatus.PAYMENT_PENDING
      ) {
        throw new Error("Không thể huỷ buổi học đã kết thúc hoặc đã bị huỷ");
      }

      // BR35: Không cho phép hủy sau khi buổi học đã bắt đầu
      // (CancellationPolicy.ts cũng define rule này; giữ nhất quán giữa domain và use case)
      const cancelNow = new Date();
      if (cancelNow >= session.scheduledAt) {
        throw new Error(
          "Không thể huỷ buổi học đã qua giờ bắt đầu. " +
          "Vui lòng đánh dấu vắng mặt (no-show) hoặc liên hệ Admin nếu có tranh chấp."
        );
      }

      // Kiểm tra late cancellation (BR35)
      const lateThresholdMinutes = await uow.systemConfig.getNumber(
        SYSTEM_CONFIG_KEYS.LATE_CANCEL_THRESHOLD_MINUTES,
        LATE_CANCEL_THRESHOLD_MINUTES
      );
      const minutesBeforeStart = (session.scheduledAt.getTime() - cancelNow.getTime()) / 60000;
      const isLateCancellation = minutesBeforeStart <= lateThresholdMinutes;

      // Update session
      const updated = await uow.sessions.updateStatus(sessionId, SessionStatus.CANCELLED, {
        cancelReason: reason,
        cancelledBy,
        isLateCancellation,
      });

      if (isLateCancellation) {
        await uow.users.incrementLateCancellation(cancelledBy);
        await uow.users.createAuditLog({
          userId: cancelledBy,
          action: "LATE_CANCELLATION",
          newValues: { sessionId, minutesBeforeStart: Math.round(minutesBeforeStart) },
          performedBy: cancelledBy,
        });
      }

      return updated;
    });
  }
}

export class CompleteSessionUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(sessionId: string, mentorId: string): Promise<SessionRecord> {
    return this.uow.execute(async (uow) => {
      const session = await uow.sessions.findById(sessionId);
      if (!session) throw new Error("Không tìm thấy buổi học");

      if (session.mentorId !== mentorId) {
        throw new Error("Bạn không có quyền kết thúc buổi học này");
      }

      if (session.status !== SessionStatus.CONFIRMED && session.status !== SessionStatus.IN_PROGRESS) {
        throw new Error("Buu1ed5i hu1ecdc khu00f4ng trong tru1ea1ng thu00e1i cu00f3 thu1ec3 ku1ebft thu00fac");
      }

      // BUG-C3 fix: chỉ cho phép kết thúc sau khi buổi học đã bắt đầu.
      // IN_PROGRESS sessions have already started — no time check needed.
      // CONFIRMED sessions: block if scheduledAt is still in the future.
      if (session.status === SessionStatus.CONFIRMED && new Date() < new Date(session.scheduledAt)) {
        throw new Error("Buổi học chưa đến giờ. Không thể kết thúc trước khi buổi học bắt đầu.");
      }

      const newStatus = session.fee > 0 ? SessionStatus.PAYMENT_PENDING : SessionStatus.COMPLETED;
      const updated = await uow.sessions.updateStatus(sessionId, newStatus, {});

      // Cập nhật totalSessions trên MentorProfile khi buổi học hoàn toàn miễn phí
      // (có phí thì đợi sau khi payment verified để tránh count sớm)
      if (newStatus === SessionStatus.COMPLETED) {
        await uow.mentorProfiles.incrementTotalSessions(mentorId);
      }

      return updated;
    });
  }
}

// ─── ConfirmCompletionUseCase ──────────────────────────────────────────────────

export class ConfirmCompletionUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    sessionId: string,
    userId: string,
    meetLink?: string
  ): Promise<SessionRecord> {
    return this.uow.execute(async (uow) => {
      const session = await uow.sessions.findById(sessionId);
      if (!session) throw new Error("Không tìm thấy buổi học");

      const isMentor = session.mentorId === userId;
      const isMentee = session.menteeId === userId;

      if (!isMentor && !isMentee) {
        throw new Error("Bạn không có quyền xác nhận buổi học này");
      }

      if (
        session.status !== SessionStatus.CONFIRMED &&
        session.status !== SessionStatus.IN_PROGRESS
      ) {
        throw new Error("Buổi học chưa được xác nhận hoặc đã kết thúc");
      }

      const confirmedBy = isMentor ? "mentor" : "mentee";

      if (isMentor && meetLink) {
        const isValid = /^https:\/\/meet\.google\.com\/[a-z0-9-]{3,}/.test(meetLink);
        if (!isValid) {
          throw new Error("Link Google Meet không hợp lệ");
        }
      }

      const updatedSession = await uow.sessions.updateConfirmation(sessionId, confirmedBy, { meetLink });

      // Type-safe access: SessionRecord interface defines mentorConfirmed/menteeConfirmed
      const newMentorConfirmed = isMentor ? true : updatedSession.mentorConfirmed;
      const newMenteeConfirmed = isMentee ? true : updatedSession.menteeConfirmed;

      if (newMentorConfirmed && newMenteeConfirmed) {
        const newStatus = session.fee > 0 ? SessionStatus.PAYMENT_PENDING : SessionStatus.COMPLETED;
        const finalSession = await uow.sessions.updateStatus(sessionId, newStatus, {});

        if (newStatus === SessionStatus.COMPLETED) {
          await uow.mentorProfiles.incrementTotalSessions(session.mentorId);
        }

        await uow.users.createAuditLog({
          userId,
          action: "SESSION_COMPLETED",
          newValues: { sessionId, status: newStatus, mentorConfirmed: true, menteeConfirmed: true },
          performedBy: userId,
        });

        return finalSession;
      }

      return updatedSession;
    });
  }
}

// ─── MarkNoShowUseCase ─────────────────────────────────────────────────────────

export class MarkNoShowUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(sessionId: string, mentorId: string): Promise<SessionRecord> {
    return this.uow.execute(async (uow) => {
      const session = await uow.sessions.findById(sessionId);
      if (!session) throw new Error("Không tìm thấy buổi học");

      if (session.mentorId !== mentorId) {
        throw new Error("Bạn không có quyền đánh dấu vắng mặt cho buổi học này");
      }

      if (
        session.status !== SessionStatus.CONFIRMED &&
        session.status !== SessionStatus.IN_PROGRESS
      ) {
        throw new Error("Chỉ có thể đánh dấu vắng mặt cho buổi học đã xác nhận");
      }

      const now = new Date();
      if (now < session.scheduledAt) {
        throw new Error("Chưa đến giờ buổi học. Chỉ có thể đánh dấu vắng mặt sau giờ bắt đầu.");
      }

      let newStatus: SessionStatus;
      if (session.fee > 0) {
        newStatus = SessionStatus.PAYMENT_PENDING;
      } else {
        newStatus = SessionStatus.NO_SHOW;
      }

      const updated = await uow.sessions.updateStatus(sessionId, newStatus, {
        isNoShow: true,
        noShowMarkedBy: mentorId,
      });

      // Tăng noShowCount của mentee (BR37)
      await uow.users.incrementNoShow(session.menteeId);

      await uow.users.createAuditLog({
        userId: mentorId,
        action: "SESSION_NO_SHOW_MARKED",
        newValues: { sessionId, menteeId: session.menteeId, fee: session.fee },
        performedBy: mentorId,
      });

      return updated;
    });
  }
}

// ─── RateSessionUseCase ────────────────────────────────────────────────────────

export class RateSessionUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(sessionId: string, menteeId: string, rating: number, comment?: string): Promise<SessionRecord> {
    if (rating < 1 || rating > 5) throw new Error("Đánh giá phải từ 1-5 sao");

    return this.uow.execute(async (uow) => {
      const session = await uow.sessions.findById(sessionId);
      if (!session) throw new Error("Không tìm thấy buổi học");
      if (session.menteeId !== menteeId) throw new Error("Không có quyền đánh giá");
      if (session.status !== SessionStatus.COMPLETED) {
        throw new Error("Chỉ có thể đánh giá buổi học đã hoàn thành");
      }
      if (session.rating !== null) {
        throw new Error("Buổi học này đã được đánh giá");
      }

      const rated = await uow.sessions.addRating(sessionId, rating, comment);

      // Cập nhật rating stats trên MentorProfile
      await uow.mentorProfiles.updateRatingStats(session.mentorId, rating);

      return rated;
    });
  }
}

// ─── ApplyForMentorUseCase (DEPRECATED) ───────────────────────────────────────
// DEPRECATED: Sử dụng SubmitMentorApplicationUseCase từ MentorApplicationUseCases.ts thay thế.
// Class này chỉ giữ lại cho backward-compat; không nên dùng cho code mới.
// @deprecated Use MentorApplicationUseCases.SubmitMentorApplicationUseCase instead.

export interface ApplyForMentorDTO {
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

export class ApplyForMentorUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: ApplyForMentorDTO): Promise<{ applicationId: string }> {
    return this.uow.execute(async (uow) => {
      const user = await uow.users.findById(input.userId);
      if (!user) throw new Error("Không tìm thấy người dùng");

      if (user.status !== UserStatus.ACTIVE) {
        throw new Error("Tài khoản chưa được kích hoạt");
      }

      if (user.isMentor()) throw new Error("Bạn đã là Mentor rồi");

      const existing = await uow.mentorApplications.findByUserId(input.userId);
      if (existing) {
        if (existing.status === "PENDING") {
          return { applicationId: existing.id };
        }
        if (existing.status === "APPROVED") {
          throw new Error("Bạn đã là Mentor rồi");
        }
        throw new Error("Đơn đăng ký trước đây của bạn đã bị từ chối. Vui lòng liên hệ Admin.");
      }

      const contactInfoStr = input.contactInfo ? JSON.stringify(input.contactInfo) : undefined;
      const newApplication = await uow.mentorApplications.create({
        id: createId(),
        userId: input.userId,
        motivation: input.motivation,
        experience: input.experience,
        linkedinUrl: input.linkedinUrl,
        contactInfo: contactInfoStr,
      });

      await uow.users.createAuditLog({
        userId: input.userId,
        action: "MENTOR_APPLICATION_SUBMITTED",
        newValues: { applicationId: newApplication.id },
        performedBy: input.userId,
      });

      return { applicationId: newApplication.id };
    });
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

// ─── GetMentorSessionsUseCase ─────────────────────────────────────────────────

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
