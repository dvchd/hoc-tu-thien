import { validateBookingEligibility, MIN_ADVANCE_BOOKING_HOURS, MAX_ACTIVE_BOOKINGS } from "../../../../domain/value-objects/BookingPolicy";
import { UserStatus } from "../../../../domain/value-objects/UserStatus";
import { addHours } from "date-fns";

describe("BookingPolicy", () => {
  const now = new Date("2026-03-27T10:00:00Z");
  // Đủ xa để qua ngưỡng tối thiểu (1h) và vào đầu giờ
  const validScheduledAt = new Date("2026-03-27T15:00:00Z"); // 5h sau now, đầu giờ

  it("should fail if paid session and user not activated (BR03)", () => {
    const result = validateBookingEligibility({
      userStatus: UserStatus.PENDING_ACTIVATION,
      fee: 50000, // có phí
      activeBookingsCount: 0,
      scheduledAt: validScheduledAt,
      durationMinutes: 60,
      now,
    });
    expect(result.canBook).toBe(false);
    expect(result.reasons.some(r => r.includes("kích hoạt"))).toBe(true);
  });

  it("should allow free session for unactivated user (BR04)", () => {
    const result = validateBookingEligibility({
      userStatus: UserStatus.PENDING_ACTIVATION,
      fee: 0, // miễn phí
      activeBookingsCount: 0,
      scheduledAt: validScheduledAt,
      durationMinutes: 60,
      now,
    });
    expect(result.canBook).toBe(true);
    expect(result.reasons.length).toBe(0);
  });

  it("should fail if active bookings count exceeds limit (BR05)", () => {
    const result = validateBookingEligibility({
      userStatus: UserStatus.ACTIVE,
      fee: 0,
      activeBookingsCount: MAX_ACTIVE_BOOKINGS, // đúng bằng giới hạn
      scheduledAt: validScheduledAt,
      durationMinutes: 60,
      now,
    });
    expect(result.canBook).toBe(false);
    expect(result.reasons.some(r => r.includes("booking") || r.includes("buổi học chờ"))).toBe(true);
  });

  it("should fail if booking is too close to start time (BR10)", () => {
    const result = validateBookingEligibility({
      userStatus: UserStatus.ACTIVE,
      fee: 0,
      activeBookingsCount: 0,
      // Đặt trước chưa đủ MIN_ADVANCE_BOOKING_HOURS
      scheduledAt: addHours(now, MIN_ADVANCE_BOOKING_HOURS - 0.5),
      durationMinutes: 60,
      now,
    });
    expect(result.canBook).toBe(false);
    expect(result.reasons.some(r => r.includes("đặt lịch trước"))).toBe(true);
  });

  it("should fail if duration is not a valid whole-hour value (BR11)", () => {
    const result = validateBookingEligibility({
      userStatus: UserStatus.ACTIVE,
      fee: 0,
      activeBookingsCount: 0,
      scheduledAt: validScheduledAt,
      durationMinutes: 90, // 1.5h - không hợp lệ
      now,
    });
    expect(result.canBook).toBe(false);
    expect(result.reasons.some(r => r.includes("Thời lượng"))).toBe(true);
  });

  it("should fail if scheduledAt is not at the start of an hour", () => {
    const scheduledAt = new Date("2026-03-27T15:30:00Z"); // không đúng đầu giờ

    const result = validateBookingEligibility({
      userStatus: UserStatus.ACTIVE,
      fee: 0,
      activeBookingsCount: 0,
      scheduledAt,
      durationMinutes: 60,
      now,
    });
    expect(result.canBook).toBe(false);
    expect(result.reasons.some(r => r.includes("đầu giờ"))).toBe(true);
  });

  it("should pass if all rules are satisfied for active user", () => {
    const result = validateBookingEligibility({
      userStatus: UserStatus.ACTIVE,
      fee: 50000,
      activeBookingsCount: 0,
      scheduledAt: validScheduledAt,
      durationMinutes: 60,
      now,
    });
    expect(result.canBook).toBe(true);
    expect(result.reasons.length).toBe(0);
  });

  it("should respect custom minAdvanceHours from SystemConfig", () => {
    const result = validateBookingEligibility({
      userStatus: UserStatus.ACTIVE,
      fee: 0,
      activeBookingsCount: 0,
      scheduledAt: addHours(now, 1.5), // 1.5h sau - đủ với min=1h nhưng không đủ với min=2h
      durationMinutes: 60,
      minAdvanceHours: 2, // override
      now,
    });
    expect(result.canBook).toBe(false);
  });
});
