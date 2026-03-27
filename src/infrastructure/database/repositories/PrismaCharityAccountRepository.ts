import { PrismaClient } from "@prisma/client";
import {
  ICharityAccountRepository,
  CharityAccountRecord,
  CreateCharityAccountInput,
  UpdateCharityAccountInput,
} from "../../../domain/repositories/ICharityAccountRepository";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createId } = require("@paralleldrive/cuid2");

export class PrismaCharityAccountRepository implements ICharityAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

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
    };
  }

  async findById(id: string): Promise<CharityAccountRecord | null> {
    const a = await (this.prisma as any).charityAccount.findUnique({ where: { id } });
    return a ? this.toRecord(a) : null;
  }

  async findByAccountNo(accountNo: string): Promise<CharityAccountRecord | null> {
    const a = await (this.prisma as any).charityAccount.findUnique({ where: { accountNo } });
    return a ? this.toRecord(a) : null;
  }

  async findAll(options?: { isActive?: boolean; includeDeleted?: boolean }): Promise<CharityAccountRecord[]> {
    const where: any = {};
    if (!options?.includeDeleted) where.isDeleted = false;
    if (options?.isActive !== undefined) where.isActive = options.isActive;

    const results = await (this.prisma as any).charityAccount.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return results.map((a: any) => this.toRecord(a));
  }

  async findDefault(): Promise<CharityAccountRecord | null> {
    const a = await (this.prisma as any).charityAccount.findFirst({
      where: { isDefault: true, isActive: true, isDeleted: false },
    });
    return a ? this.toRecord(a) : null;
  }

  async create(input: CreateCharityAccountInput): Promise<CharityAccountRecord> {
    const created = await (this.prisma as any).charityAccount.create({
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
      },
    });
    return this.toRecord(created);
  }

  async update(id: string, input: UpdateCharityAccountInput): Promise<CharityAccountRecord> {
    const data: any = { updatedAt: new Date() };
    if (input.name !== undefined) data.name = input.name;
    if (input.bankName !== undefined) data.bankName = input.bankName;
    if (input.campaignKeyword !== undefined) data.campaignKeyword = input.campaignKeyword;
    if (input.description !== undefined) data.description = input.description;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.isDefault !== undefined) data.isDefault = input.isDefault;

    const updated = await (this.prisma as any).charityAccount.update({ where: { id }, data });
    return this.toRecord(updated);
  }

  async deactivate(id: string): Promise<void> {
    await (this.prisma as any).charityAccount.update({
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
    await (this.prisma as any).charityAccount.delete({ where: { id } });
  }

  async getUsageCount(id: string): Promise<number> {
    // Kiểm tra qua accountNo vì payment lưu accountNo, không lưu ID
    const account = await this.findById(id);
    if (!account) return 0;

    const [mentorCount, paymentCount] = await Promise.all([
      this.prisma.mentorProfile.count({ where: { charityAccountId: id } }),
      this.prisma.payment.count({ where: { tnAccountNo: account.accountNo, isDeleted: false } }),
    ]);
    return mentorCount + paymentCount;
  }

  async clearDefault(): Promise<void> {
    await (this.prisma as any).charityAccount.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }
}
