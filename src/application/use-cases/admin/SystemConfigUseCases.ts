import { IUnitOfWork } from "../../interfaces/IUnitOfWork";
import {
  SystemConfigRecord,
  SYSTEM_CONFIG_KEYS,
  SystemConfigKey,
} from "../../../domain/repositories/ISystemConfigRepository";

// ─── GetSystemConfigUseCase ───────────────────────────────────────────────────

export class GetSystemConfigUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(): Promise<SystemConfigRecord[]> {
    return this.uow.systemConfig.getAll();
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

    // Validate value types
    for (const config of configs) {
      if (config.key !== SYSTEM_CONFIG_KEYS.DEFAULT_CHARITY_ACCOUNT_ID) {
        const num = parseInt(config.value, 10);
        if (isNaN(num) || num <= 0) {
          throw new Error(`Giá trị không hợp lệ cho ${config.key}: phải là số nguyên dương`);
        }
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
