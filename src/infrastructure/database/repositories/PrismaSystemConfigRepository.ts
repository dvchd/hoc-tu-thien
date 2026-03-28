import { PrismaClient } from "@prisma/client";
import {
  ISystemConfigRepository,
  SystemConfigRecord,
} from "../../../domain/repositories/ISystemConfigRepository";

const { createId } = require("@paralleldrive/cuid2");

type PrismaTransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class PrismaSystemConfigRepository implements ISystemConfigRepository {
  constructor(private readonly prisma: PrismaClient | PrismaTransactionClient) {}

  private toRecord(c: any): SystemConfigRecord {
    return {
      id: c.id,
      key: c.key,
      value: c.value,
      description: c.description,
      updatedAt: c.updatedAt,
      updatedBy: c.updatedBy,
    };
  }

  async get(key: string): Promise<string | null> {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    return config?.value ?? null;
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const val = await this.get(key);
    if (val === null) return fallback;
    const num = parseInt(val, 10);
    return isNaN(num) ? fallback : num;
  }

  async getAll(): Promise<SystemConfigRecord[]> {
    const results = await this.prisma.systemConfig.findMany({
      orderBy: { key: "asc" },
    });
    return results.map((c) => this.toRecord(c));
  }

  async set(key: string, value: string, updatedBy?: string): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value, updatedBy: updatedBy ?? null },
      create: { id: createId(), key, value, updatedBy: updatedBy ?? null },
    });
  }

  async setMultiple(
    configs: { key: string; value: string }[],
    updatedBy?: string
  ): Promise<void> {
    await Promise.all(
      configs.map((c) =>
        this.prisma.systemConfig.upsert({
          where: { key: c.key },
          update: { value: c.value, updatedBy: updatedBy ?? null },
          create: { id: createId(), key: c.key, value: c.value, updatedBy: updatedBy ?? null },
        })
      )
    );
  }
}
