import { IUnitOfWork } from "../../interfaces/IUnitOfWork";
import {
  SystemConfigRecord,
  SYSTEM_CONFIG_KEYS,
  SystemConfigKey,
} from "../../../domain/repositories/ISystemConfigRepository";

// ─── Default values & descriptions for auto-initialization ────────────────────
// Used when a config key is missing from the DB (e.g. after DB wipe, before seed).

const CONFIG_DEFAULTS: Record<SystemConfigKey, { value: string; description: string }> = {
  [SYSTEM_CONFIG_KEYS.ACTIVATION_AMOUNT]: {
    value: "10000",
    description: "Số tiền kích hoạt tài khoản (VNĐ). Mentee phải chuyển khoản thiện nguyện số tiền này để kích hoạt tài khoản.",
  },
  [SYSTEM_CONFIG_KEYS.CHARITY_ACCOUNT_VERIFICATION_AMOUNT]: {
    value: "1000",
    description: "Số tiền probe transfer để xác thực tài khoản thiện nguyện (VNĐ). Admin chuyển 1,000đ để xác nhận sở hữu tài khoản.",
  },
  [SYSTEM_CONFIG_KEYS.MIN_BOOKING_ADVANCE_HOURS]: {
    value: "1",
    description: "Số giờ tối thiểu trước giờ bắt đầu buổi học mà Mentee được phép đặt lịch. Đặt lịch muộn hơn sẽ bị từ chối.",
  },
  [SYSTEM_CONFIG_KEYS.LATE_CANCEL_THRESHOLD_MINUTES]: {
    value: "30",
    description: "Ngưỵ thời gian (phút) trước giờ bắt đầu buổi học. Nếu hủy trong khoảng thời gian này sẽ bị đánh dấu hủy muộn.",
  },
  [SYSTEM_CONFIG_KEYS.MAX_ACTIVE_BOOKINGS]: {
    value: "3",
    description: "Số buổi học đang hoạt động tối đa mà mỗi Mentee được phép đặt đồng thời. Đặt lịch mới sẽ bị từ chối nếu vượt quá.",
  },
};

// ─── GetSystemConfigUseCase ───────────────────────────────────────────────────

export class GetSystemConfigUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(): Promise<SystemConfigRecord[]> {
    const configs = await this.uow.systemConfig.getAll();

    // Auto-create missing config keys so the admin UI always shows all settings.
    // This handles the case where DB was wiped but seed hasn't been re-run.
    const existingKeys = new Set(configs.map((c) => c.key));
    const allKeys = Object.values(SYSTEM_CONFIG_KEYS);
    let created = false;

    for (const key of allKeys) {
      if (!existingKeys.has(key)) {
        const def = CONFIG_DEFAULTS[key];
        await this.uow.systemConfig.set(key, def.value, "system", def.description);
        existingKeys.add(key);
        created = true;
      }
    }

    // If we created new configs, fetch again to include descriptions
    return created ? this.uow.systemConfig.getAll() : configs;
  }

  async getOne(key: string): Promise<string | null> {
    return this.uow.systemConfig.get(key);
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    return this.uow.systemConfig.getNumber(key, fallback);
  }
}

// ─── UpdateSystemConfigUseCase ────────────────────────────────────────────────

const ALLOWED_KEYS: SystemConfigKey[] = Object.values(SYSTEM_CONFIG_KEYS);

export class UpdateSystemConfigUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    configs: { key: string; value: string }[],
    adminId: string
  ): Promise<void> {
    // Validate all keys are allowed
    for (const config of configs) {
      if (!ALLOWED_KEYS.includes(config.key as SystemConfigKey)) {
        throw new Error(`Config key không hợp lệ: ${config.key}`);
      }
    }

    // Validate value types — all configs must be positive integers
    for (const config of configs) {
      const num = parseInt(config.value, 10);
      if (isNaN(num) || num <= 0) {
        throw new Error(`Giá trị không hợp lệ cho ${config.key}: phải là số nguyên dương`);
      }
    }

    await this.uow.systemConfig.setMultiple(configs, adminId);

    await this.uow.users.createAuditLog({
      userId: adminId,
      action: "SYSTEM_CONFIG_UPDATED",
      newValues: Object.fromEntries(configs.map((c) => [c.key, c.value])),
      performedBy: adminId,
    });
  }
}
