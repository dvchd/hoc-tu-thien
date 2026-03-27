import { addHours, isBefore, startOfHour, getMinutes } from "date-fns";

export interface BookingValidationResult {
  canBook: boolean;
  reasons: string[];
}

export const MIN_ADVANCE_BOOKING_HOURS = 2;
export const MAX_ACTIVE_BOOKINGS = 5;

/**
 * Validate booking eligibility based on business rules.
 */
export function validateBookingEligibility(params: {
  userStatus: string;
  isPaidSession: boolean;
  activeBookingsCount: number;
  scheduledAt: Date;
  durationMinutes: number;
  now?: Date;
}): BookingValidationResult {
  const reasons: string[] = [];
  const now = params.now || new Date();

  // BR03: Paid session requires ACTIVATED status
  if (params.isPaidSession && params.userStatus !== "ACTIVATED") {
    reasons.push("Bạn cần kích hoạt tài khoản (đóng góp 10k) để đặt buổi học có phí.");
  }

  // BR05: Max active bookings
  if (params.activeBookingsCount >= MAX_ACTIVE_BOOKINGS) {
    reasons.push(`Bạn đã đạt giới hạn ${MAX_ACTIVE_BOOKINGS} buổi học đang chờ diễn ra.`);
  }

  // BR10: Minimum advance booking time
  const minBookingTime = addHours(now, MIN_ADVANCE_BOOKING_HOURS);
  if (isBefore(params.scheduledAt, minBookingTime)) {
    reasons.push(`Cần đặt lịch trước ít nhất ${MIN_ADVANCE_BOOKING_HOURS} giờ.`);
  }

  // BR11: Duration must be whole hours (multiples of 60 mins)
  if (params.durationMinutes % 60 !== 0) {
    reasons.push("Thời lượng buổi học phải là bội số của 60 phút (1h, 2h...).");
  }

  // Ensure scheduledAt is at the start of an hour (convention)
  if (getMinutes(params.scheduledAt) !== 0) {
    reasons.push("Buổi học phải bắt đầu vào đầu giờ (ví dụ 14:00, 15:00).");
  }

  return {
    canBook: reasons.length === 0,
    reasons
  };
}
