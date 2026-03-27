import { IUnitOfWork } from "../../interfaces/IUnitOfWork";
import {
  CharityAccountRecord,
  CreateCharityAccountInput,
  UpdateCharityAccountInput,
} from "../../../domain/repositories/ICharityAccountRepository";

// ─── CreateCharityAccountUseCase ─────────────────────────────────────────────

export class CreateCharityAccountUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    input: CreateCharityAccountInput & { adminId: string }
  ): Promise<CharityAccountRecord> {
    // Kiểm tra accountNo đã tồn tại chưa
    const existing = await this.uow.charityAccounts.findByAccountNo(input.accountNo);
    if (existing) {
      throw new Error(`Tài khoản ${input.accountNo} đã tồn tại trong hệ thống`);
    }

    // Nếu set isDefault = true → clear default trước
    if (input.isDefault) {
      await this.uow.charityAccounts.clearDefault();
    }

    const account = await this.uow.charityAccounts.create({
      ...input,
      createdBy: input.adminId,
    });

    await this.uow.users.createAuditLog({
      userId: input.adminId,
      action: "CHARITY_ACCOUNT_CREATED",
      newValues: { accountId: account.id, accountNo: account.accountNo, name: account.name },
      performedBy: input.adminId,
    });

    return account;
  }
}

// ─── ListCharityAccountsUseCase ───────────────────────────────────────────────

export class ListCharityAccountsUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(options?: { isActive?: boolean; includeDeleted?: boolean }): Promise<CharityAccountRecord[]> {
    return this.uow.charityAccounts.findAll(options);
  }
}

// ─── UpdateCharityAccountUseCase ─────────────────────────────────────────────

export class UpdateCharityAccountUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    id: string,
    input: UpdateCharityAccountInput,
    adminId: string
  ): Promise<CharityAccountRecord> {
    const account = await this.uow.charityAccounts.findById(id);
    if (!account) throw new Error("Không tìm thấy tài khoản thiện nguyện");

    // Nếu set isDefault = true → clear default trước
    if (input.isDefault) {
      await this.uow.charityAccounts.clearDefault();
    }

    const updated = await this.uow.charityAccounts.update(id, input);

    await this.uow.users.createAuditLog({
      userId: adminId,
      action: "CHARITY_ACCOUNT_UPDATED",
      oldValues: { name: account.name, isActive: account.isActive, isDefault: account.isDefault },
      newValues: input,
      performedBy: adminId,
    });

    return updated;
  }
}

// ─── DeleteCharityAccountUseCase ─────────────────────────────────────────────

export class DeleteCharityAccountUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(id: string, adminId: string): Promise<void> {
    const account = await this.uow.charityAccounts.findById(id);
    if (!account) throw new Error("Không tìm thấy tài khoản thiện nguyện");

    const usageCount = await this.uow.charityAccounts.getUsageCount(id);
    if (usageCount > 0) {
      throw new Error(
        `Không thể xóa tài khoản "${account.name}" vì đang được sử dụng (${usageCount} mentor/giao dịch). ` +
        `Hãy vô hiệu hóa thay vì xóa.`
      );
    }

    await this.uow.charityAccounts.delete(id);

    await this.uow.users.createAuditLog({
      userId: adminId,
      action: "CHARITY_ACCOUNT_DELETED",
      oldValues: { accountId: id, name: account.name, accountNo: account.accountNo },
      performedBy: adminId,
    });
  }
}
