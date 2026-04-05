import { PrismaClient } from "@prisma/client";
import {
  ICharityAccountRepository,
  CharityAccountRecord,
  CreateCharityAccountInput,
  UpdateCharityAccountInput,
} from "../../../domain/repositories/ICharityAccountRepository";
import { CharityAccountVerificationStatus } from "../../../domain/value-objects/Payment";

const { createId } = require("@paralleldrive/cuid2");

type PrismaTransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class PrismaCharityAccountRepository implements ICharityAccountRepository {
  constructor(private readonly prisma: PrismaClient | PrismaTransactionClient) {}

  private toRecord(a: any): CharityAccountRecord {
    return {
      id: a.id,
      name: a.name,
      accountNo: a.accountNo,
      bankName: a.bankName,
      campaignKeyword: a.campaignKeyword,
      description: a.description,
      isActive: a.isActive,
      isDefault: a.isDefault,
      usageCount: a.usageCount,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      createdBy: a.createdBy,
      isDeleted: a.isDeleted,
      deletedAt: a.deletedAt,
      // verification fields
      verificationStatus: a.verificationStatus ?? CharityAccountVerificationStatus.UNVERIFIED,
      verificationPaymentId: a.verificationPaymentId ?? null,
      verificationShortCode: a.verificationShortCode ?? null,
      verifiedAt: a.verifiedAt ?? null,
      verifiedBy: a.verifiedBy ?? null,
      verificationNote: a.verificationNote ?? null,
    };
  }

  async findById(id: string): Promise<CharityAccountRecord | null> {
    const a = await this.prisma.charityAccount.findUnique({ where: { id } });
    return a ? this.toRecord(a) : null;
  }

  async findByAccountNo(accountNo: string): Promise<CharityAccountRecord | null> {
    const a = await this.prisma.charityAccount.findUnique({ where: { accountNo } });
    return a ? this.toRecord(a) : null;
  }

  async findAll(options?: { isActive?: boolean; includeDeleted?: boolean }): Promise<CharityAccountRecord[]> {
    const where: Record<string, unknown> = {};
    if (!options?.includeDeleted) where.isDeleted = false;
    if (options?.isActive !== undefined) where.isActive = options.isActive;

    const results = await this.prisma.charityAccount.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return results.map((a) => this.toRecord(a));
  }

  async findDefault(): Promise<CharityAccountRecord | null> {
    const a = await this.prisma.charityAccount.findFirst({
      where: { isDefault: true, isActive: true, isDeleted: false },
    });
    return a ? this.toRecord(a) : null;
  }

  async create(input: CreateCharityAccountInput): Promise<CharityAccountRecord> {
    const created = await this.prisma.charityAccount.create({
      data: {
        id: createId(),
        name: input.name,
        accountNo: input.accountNo,
        bankName: input.bankName ?? "MB Bank",
        campaignKeyword: input.campaignKeyword ?? null,
        description: input.description ?? null,
        isActive: true,
        isDefault: input.isDefault ?? false,
        usageCount: 0,
        createdBy: input.createdBy ?? null,
        verificationStatus: CharityAccountVerificationStatus.UNVERIFIED,
      },
    });
    return this.toRecord(created);
  }

  async update(id: string, input: UpdateCharityAccountInput): Promise<CharityAccountRecord> {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) data.name = input.name;
    if (input.bankName !== undefined) data.bankName = input.bankName;
    if (input.campaignKeyword !== undefined) data.campaignKeyword = input.campaignKeyword;
    if (input.description !== undefined) data.description = input.description;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.isDefault !== undefined) data.isDefault = input.isDefault;

    const updated = await this.prisma.charityAccount.update({ where: { id }, data });
    return this.toRecord(updated);
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.charityAccount.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });
  }

  async delete(id: string): Promise<void> {
    const count = await this.getUsageCount(id);
    if (count > 0) {
      throw new Error(
        `Không thể xóa tài khoản này vì đang được sử dụng (${count} mentor/giao dịch). Hãy vô hiệu hóa thay vì xóa.`
      );
    }
    await this.prisma.charityAccount.delete({ where: { id } });
  }

  async getUsageCount(id: string): Promise<number> {
    const account = await this.findById(id);
    if (!account) return 0;

    const [mentorCount, paymentCount] = await Promise.all([
      this.prisma.mentorProfile.count({ where: { charityAccountId: id } }),
      this.prisma.payment.count({ where: { tnAccountNo: account.accountNo, isDeleted: false } }),
    ]);
    return mentorCount + paymentCount;
  }

  async clearDefault(): Promise<void> {
    await this.prisma.charityAccount.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  async updateVerificationStatus(
    id: string,
    status: string,
    opts?: {
      verificationPaymentId?: string;
      verificationShortCode?: string;
      verifiedAt?: Date;
      verifiedBy?: string;
      verificationNote?: string;
    }
  ): Promise<CharityAccountRecord> {
    const data: Record<string, unknown> = {
      verificationStatus: status,
      updatedAt: new Date(),
    };
    if (opts?.verificationPaymentId !== undefined) data.verificationPaymentId = opts.verificationPaymentId;
    if (opts?.verificationShortCode !== undefined) data.verificationShortCode = opts.verificationShortCode;
    if (opts?.verifiedAt !== undefined) data.verifiedAt = opts.verifiedAt;
    if (opts?.verifiedBy !== undefined) data.verifiedBy = opts.verifiedBy;
    if (opts?.verificationNote !== undefined) data.verificationNote = opts.verificationNote;

    const updated = await this.prisma.charityAccount.update({ where: { id }, data });
    return this.toRecord(updated);
  }
}
