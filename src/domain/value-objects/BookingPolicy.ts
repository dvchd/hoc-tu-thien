/**
 * BookingPolicy - Value Object chứa domain logic kiểm tra điều kiện đặt lịch.
 *
 * Constants mặc định được import từ Payment.ts (single source of truth).
 * Các giá trị runtime được lấy từ SystemConfig (configurable bởi Admin).
 */

import {
  MIN_ADVANCE_BOOKING_HOURS,
  MAX_ACTIVE_BOOKINGS,
  VALID_DURATION_HOURS,
} from "./Payment";
import { UserStatus } from "./UserStatus";

export { MIN_ADVANCE_BOOKING_HOURS, MAX_ACTIVE_BOOKINGS, VALID_DURATION_HOURS };

export interface BookingValidationResult {
  canBook: boolean;
  reasons: string[];
}

/**
 * Validate booking eligibility based on business rules.
 * Dùng trong unit tests; production code dùng trực tiếp trong BookSessionUseCase.
 *
 * @param params.userStatus - trạng thái tài khoản mentee
 * @param params.fee - học phí buổi học (0 = miễn phí)
 * @param params.activeBookingsCount - số booking active hiện tại của mentee
 * @param params.scheduledAt - thời gian bắt đầu buổi học
 * @param params.durationMinutes - thời lượng (phút)
 * @param params.minAdvanceHours - ngưỡng đặt trước tối thiểu (lấy từ SystemConfig)
 * @param params.maxActiveBookings - giới hạn booking active (lấy từ SystemConfig)
 * @param params.now - override thời gian hiện tại (cho testing)
 */
export function validateBookingEligibility(params: {
  userStatus: string;
  fee: number;
  activeBookingsCount: number;
  scheduledAt: Date;
  durationMinutes: number;
  minAdvanceHours?: number;
  maxActiveBookings?: number;
  now?: Date;
}): BookingValidationResult {
  const reasons: string[] = [];
  const now = params.now ?? new Date();
  const minAdvanceHours = params.minAdvanceHours ?? MIN_ADVANCE_BOOKING_HOURS;
  const maxBookings = params.maxActiveBookings ?? MAX_ACTIVE_BOOKINGS;

  // BR03: Session có phí -> yêu cầu ACTIVE
  // BR04: Session miễn phí -> cho phép PENDING_ACTIVATION
  if (params.fee > 0 && params.userStatus !== UserStatus.ACTIVE) {
    reasons.push("Bạn cần kích hoạt tài khoản để đặt buổi học có phí.");
  }

  // BR05: Giới hạn số booking active cùng lúc
  if (params.activeBookingsCount >= maxBookings) {
    reasons.push(`Bạn đang có ${params.activeBookingsCount} buổi học chờ diễn ra. Tối đa ${maxBookings} buổi cùng lúc.`);
  }

  // BR10: Phải đặt trước tối thiểu X giờ
  const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000;
  if (params.scheduledAt.getTime() - now.getTime() < minAdvanceMs) {
    reasons.push(`Cần đặt lịch trước ít nhất ${minAdvanceHours} giờ.`);
  }

  // BR11: Thời lượng phải là giờ nguyên hợp lệ
  const durationHours = params.durationMinutes / 60;
  if (!VALID_DURATION_HOURS.includes(durationHours)) {
    reasons.push(`Thời lượng buổi học phải là ${VALID_DURATION_HOURS.join(", ")} giờ.`);
  }

  // Buổi học phải bắt đầu vào đầu giờ (convention)
  if (params.scheduledAt.getMinutes() !== 0) {
    reasons.push("Buổi học phải bắt đầu vào đầu giờ (ví dụ 14:00, 15:00).");
  }

  return {
    canBook: reasons.length === 0,
    reasons,
  };
}
