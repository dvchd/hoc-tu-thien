import { differenceInMinutes } from "date-fns";

export interface CancellationResult {
  canCancel: boolean;
  isLateCancellation: boolean;
  reason?: string;
}

export const LATE_CANCEL_THRESHOLD_MINUTES = 30;

/**
 * Evaluate if a session can be cancelled and if it's considered late.
 * BR09: Session can't be cancelled after it's passed scheduledAt.
 * BR10: Late cancellation happens within 30 mins before scheduledAt.
 */
export function evaluateCancellation(
  scheduledAt: Date,
  cancelAt: Date = new Date()
): CancellationResult {
  if (cancelAt >= scheduledAt) {
    return {
      canCancel: false,
      isLateCancellation: false,
      reason: "Không thể hủy buổi học đã diễn ra hoặc đã bắt đầu."
    };
  }

  const minutesBeforeStart = differenceInMinutes(scheduledAt, cancelAt);

  if (minutesBeforeStart <= LATE_CANCEL_THRESHOLD_MINUTES) {
    return {
      canCancel: true,
      isLateCancellation: true,
      reason: "Hủy trễ (ít hơn 30 phút trước khi bắt đầu). Bạn sẽ bị ghi nhận hủy trễ."
    };
  }

  return {
    canCancel: true,
    isLateCancellation: false
  };
}
