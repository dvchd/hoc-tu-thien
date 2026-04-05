import { evaluateCancellation } from "../../../../domain/value-objects/CancellationPolicy";
import { addMinutes, subMinutes } from "date-fns";

describe("CancellationPolicy", () => {
  const scheduledAt = new Date("2026-03-27T10:00:00Z");

  it("should not allow cancellation if the session has already started", () => {
    const cancelAt = addMinutes(scheduledAt, 1);
    const result = evaluateCancellation(scheduledAt, cancelAt);
    expect(result.canCancel).toBe(false);
    expect(result.reason).toContain("đã diễn ra");
  });

  it("should mark as late cancellation if within 30 minutes before start", () => {
    const cancelAt = subMinutes(scheduledAt, 15);
    const result = evaluateCancellation(scheduledAt, cancelAt);
    expect(result.canCancel).toBe(true);
    expect(result.isLateCancellation).toBe(true);
    expect(result.reason).toContain("Hủy trễ");
  });

  it("should not mark as late cancellation if more than 30 minutes before start", () => {
    const cancelAt = subMinutes(scheduledAt, 31);
    const result = evaluateCancellation(scheduledAt, cancelAt);
    expect(result.canCancel).toBe(true);
    expect(result.isLateCancellation).toBe(false);
  });
});
