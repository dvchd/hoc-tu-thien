// ─── SystemConfigRecord ───────────────────────────────────────────────────────

export interface SystemConfigRecord {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

// ─── Known config keys ────────────────────────────────────────────────────────

export const SYSTEM_CONFIG_KEYS = {
  ACTIVATION_AMOUNT: "activation_amount",
  CHARITY_ACCOUNT_VERIFICATION_AMOUNT: "charity_account_verification_amount",
  MIN_BOOKING_ADVANCE_HOURS: "min_booking_advance_hours",
  LATE_CANCEL_THRESHOLD_MINUTES: "late_cancel_threshold_minutes",
  PAYMENT_EXPIRY_HOURS: "payment_expiry_hours",
  MAX_ACTIVE_BOOKINGS: "max_active_bookings",
} as const;

export type SystemConfigKey = typeof SYSTEM_CONFIG_KEYS[keyof typeof SYSTEM_CONFIG_KEYS];

// ─── ISystemConfigRepository ──────────────────────────────────────────────────

export interface ISystemConfigRepository {
  get(key: string): Promise<string | null>;
  getNumber(key: string, fallback: number): Promise<number>;
  getAll(): Promise<SystemConfigRecord[]>;
  set(key: string, value: string, updatedBy?: string, description?: string | null): Promise<void>;
  setMultiple(
    configs: { key: string; value: string }[],
    updatedBy?: string
  ): Promise<void>;
}
