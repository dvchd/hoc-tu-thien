import { validateBookingEligibility } from "../../../../domain/value-objects/BookingPolicy";
import { addHours } from "date-fns";

describe("BookingPolicy", () => {
  const now = new Date("2026-03-27T10:00:00Z");

  it("should fail if paid session and user not activated", () => {
    const result = validateBookingEligibility({
      userStatus: "PENDING_ACTIVATION",
      isPaidSession: true,
      activeBookingsCount: 0,
      scheduledAt: addHours(now, 5),
      durationMinutes: 60,
      now
    });
    expect(result.canBook).toBe(false);
    expect(result.reasons).toContain("Bạn cần kích hoạt tài khoản (đóng góp 10k) để đặt buổi học có phí.");
  });

  it("should fail if active bookings count exceeds limit", () => {
    const result = validateBookingEligibility({
      userStatus: "ACTIVATED",
      isPaidSession: true,
      activeBookingsCount: 5,
      scheduledAt: addHours(now, 5),
      durationMinutes: 60,
      now
    });
    expect(result.canBook).toBe(false);
    expect(result.reasons).toContain("Bạn đã đạt giới hạn 5 buổi học đang chờ diễn ra.");
  });

  it("should fail if booking is too close to start time", () => {
    const result = validateBookingEligibility({
      userStatus: "ACTIVATED",
      isPaidSession: true,
      activeBookingsCount: 0,
      scheduledAt: addHours(now, 1),
      durationMinutes: 60,
      now
    });
    expect(result.canBook).toBe(false);
    expect(result.reasons).toContain("Cần đặt lịch trước ít nhất 2 giờ.");
  });

  it("should fail if duration is not whole hours", () => {
    const result = validateBookingEligibility({
      userStatus: "ACTIVATED",
      isPaidSession: true,
      activeBookingsCount: 0,
      scheduledAt: addHours(now, 5),
      durationMinutes: 90,
      now
    });
    expect(result.canBook).toBe(false);
    expect(result.reasons).toContain("Thời lượng buổi học phải là bội số của 60 phút (1h, 2h...).");
  });

  it("should fail if scheduledAt is not at the start of an hour", () => {
    const scheduledAt = new Date(now);
    scheduledAt.setUTCHours(scheduledAt.getUTCHours() + 5);
    scheduledAt.setUTCMinutes(30);

    const result = validateBookingEligibility({
      userStatus: "ACTIVATED",
      isPaidSession: true,
      activeBookingsCount: 0,
      scheduledAt,
      durationMinutes: 60,
      now
    });
    expect(result.canBook).toBe(false);
    expect(result.reasons).toContain("Buổi học phải bắt đầu vào đầu giờ (ví dụ 14:00, 15:00).");
  });

  it("should pass if all rules are satisfied", () => {
    const result = validateBookingEligibility({
      userStatus: "ACTIVATED",
      isPaidSession: true,
      activeBookingsCount: 2,
      scheduledAt: addHours(now, 5),
      durationMinutes: 60,
      now
    });
    expect(result.canBook).toBe(true);
    expect(result.reasons.length).toBe(0);
  });
});
