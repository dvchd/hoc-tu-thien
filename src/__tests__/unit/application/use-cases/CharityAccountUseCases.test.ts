import {
  CreateCharityAccountUseCase,
  ListCharityAccountsUseCase,
  UpdateCharityAccountUseCase,
  DeleteCharityAccountUseCase,
} from "@/application/use-cases/admin/CharityAccountUseCases";
import { createMockUnitOfWork, buildAdmin } from "@/__tests__/helpers";
import { CharityAccountRecord } from "@/domain/repositories/ICharityAccountRepository";

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const buildCharityAccount = (overrides: Partial<CharityAccountRecord> = {}): CharityAccountRecord => ({
  id: "charity_001",
  accountNo: "2000",
  name: "Quy Thien Nguyen",
  bankName: "MB Bank",
  campaignKeyword: "HTT",
  description: "Quy từ thiện giáo dục",
  isActive: true,
  isDefault: false,
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  usageCount: 0,
  createdBy: "admin_001",
  verificationStatus: "UNVERIFIED",
  verificationPaymentId: null,
  verificationShortCode: null,
  verifiedAt: null,
  verifiedBy: null,
  verificationNote: null,
  ...overrides,
});

// ─── CreateCharityAccountUseCase ───────────────────────────────────────────────

describe("CreateCharityAccountUseCase", () => {
  let useCase: CreateCharityAccountUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
    useCase = new CreateCharityAccountUseCase(uow);
  });

  it("should create charity account successfully", async () => {
    uow.charityAccounts.findByAccountNo.mockResolvedValue(null);
    uow.charityAccounts.create.mockResolvedValue(buildCharityAccount());

    const result = await useCase.execute({
      accountNo: "2000",
      name: "Quy Thien Nguyen",
      bankName: "MB Bank",
      adminId: "admin_001",
    });

    expect(result.id).toBe("charity_001");
    expect(result.name).toBe("Quy Thien Nguyen");
    expect(uow.charityAccounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ accountNo: "2000", name: "Quy Thien Nguyen", createdBy: "admin_001" })
    );
  });

  it("should throw error if account number already exists", async () => {
    uow.charityAccounts.findByAccountNo.mockResolvedValue(buildCharityAccount());

    await expect(useCase.execute({
      accountNo: "2000",
      name: "Duplicate",
      adminId: "admin_001",
    })).rejects.toThrow("đã tồn tại trong hệ thống");
  });

  it("should clear default when isDefault is true", async () => {
    uow.charityAccounts.findByAccountNo.mockResolvedValue(null);
    uow.charityAccounts.create.mockResolvedValue(buildCharityAccount({ isDefault: true }));

    await useCase.execute({
      accountNo: "3000",
      name: "New Default",
      isDefault: true,
      adminId: "admin_001",
    });

    expect(uow.charityAccounts.clearDefault).toHaveBeenCalled();
  });

  it("should NOT clear default when isDefault is false", async () => {
    uow.charityAccounts.findByAccountNo.mockResolvedValue(null);
    uow.charityAccounts.create.mockResolvedValue(buildCharityAccount({ isDefault: false }));

    await useCase.execute({
      accountNo: "3000",
      name: "Not Default",
      isDefault: false,
      adminId: "admin_001",
    });

    expect(uow.charityAccounts.clearDefault).not.toHaveBeenCalled();
  });

  it("should create audit log on creation", async () => {
    uow.charityAccounts.findByAccountNo.mockResolvedValue(null);
    uow.charityAccounts.create.mockResolvedValue(buildCharityAccount());

    await useCase.execute({
      accountNo: "2000",
      name: "Quy Thien Nguyen",
      adminId: "admin_001",
    });

    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CHARITY_ACCOUNT_CREATED",
        performedBy: "admin_001",
        newValues: expect.objectContaining({ accountNo: "2000" }),
      })
    );
  });
});

// ─── ListCharityAccountsUseCase ───────────────────────────────────────────────

describe("ListCharityAccountsUseCase", () => {
  let useCase: ListCharityAccountsUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
    useCase = new ListCharityAccountsUseCase(uow);
  });

  it("should return all accounts when no filter", async () => {
    const accounts = [buildCharityAccount(), buildCharityAccount({ id: "charity_002", accountNo: "3000" })];
    uow.charityAccounts.findAll.mockResolvedValue(accounts);

    const result = await useCase.execute();
    expect(result).toHaveLength(2);
    expect(uow.charityAccounts.findAll).toHaveBeenCalledWith(undefined);
  });

  it("should filter by isActive when provided", async () => {
    uow.charityAccounts.findAll.mockResolvedValue([buildCharityAccount()]);

    await useCase.execute({ isActive: true });
    expect(uow.charityAccounts.findAll).toHaveBeenCalledWith({ isActive: true });
  });

  it("should return empty array when no accounts", async () => {
    uow.charityAccounts.findAll.mockResolvedValue([]);

    const result = await useCase.execute();
    expect(result).toEqual([]);
  });
});

// ─── UpdateCharityAccountUseCase ─────────────────────────────────────────────

describe("UpdateCharityAccountUseCase", () => {
  let useCase: UpdateCharityAccountUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
    useCase = new UpdateCharityAccountUseCase(uow);
  });

  it("should throw error if account not found", async () => {
    uow.charityAccounts.findById.mockResolvedValue(null);

    await expect(useCase.execute("unknown_id", { name: "Updated" }, "admin_001"))
      .rejects.toThrow("Không tìm thấy tài khoản thiện nguyện");
  });

  it("should update account successfully", async () => {
    uow.charityAccounts.findById.mockResolvedValue(buildCharityAccount());
    uow.charityAccounts.update.mockResolvedValue(
      buildCharityAccount({ name: "Updated Name" })
    );

    const result = await useCase.execute("charity_001", { name: "Updated Name" }, "admin_001");
    expect(result.name).toBe("Updated Name");
    expect(uow.charityAccounts.update).toHaveBeenCalledWith("charity_001", { name: "Updated Name" });
  });

  it("should clear default when setting isDefault to true", async () => {
    uow.charityAccounts.findById.mockResolvedValue(buildCharityAccount({ isDefault: false }));
    uow.charityAccounts.update.mockResolvedValue(buildCharityAccount({ isDefault: true }));

    await useCase.execute("charity_001", { isDefault: true }, "admin_001");

    expect(uow.charityAccounts.clearDefault).toHaveBeenCalled();
  });

  it("should NOT clear default when isDefault not changed", async () => {
    uow.charityAccounts.findById.mockResolvedValue(buildCharityAccount());
    uow.charityAccounts.update.mockResolvedValue(buildCharityAccount());

    await useCase.execute("charity_001", { name: "Updated" }, "admin_001");

    expect(uow.charityAccounts.clearDefault).not.toHaveBeenCalled();
  });

  it("should create audit log with old and new values", async () => {
    uow.charityAccounts.findById.mockResolvedValue(
      buildCharityAccount({ name: "Old Name", isActive: true, isDefault: false })
    );
    uow.charityAccounts.update.mockResolvedValue(buildCharityAccount());

    await useCase.execute("charity_001", { name: "New Name" }, "admin_001");

    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CHARITY_ACCOUNT_UPDATED",
        performedBy: "admin_001",
        oldValues: expect.objectContaining({ name: "Old Name", isActive: true, isDefault: false }),
        newValues: expect.objectContaining({ name: "New Name" }),
      })
    );
  });
});

// ─── DeleteCharityAccountUseCase ─────────────────────────────────────────────

describe("DeleteCharityAccountUseCase", () => {
  let useCase: DeleteCharityAccountUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
    useCase = new DeleteCharityAccountUseCase(uow);
  });

  it("should throw error if account not found", async () => {
    uow.charityAccounts.findById.mockResolvedValue(null);

    await expect(useCase.execute("unknown_id", "admin_001"))
      .rejects.toThrow("Không tìm thấy tài khoản thiện nguyện");
  });

  it("should throw error if account is in use", async () => {
    uow.charityAccounts.findById.mockResolvedValue(buildCharityAccount());
    uow.charityAccounts.getUsageCount.mockResolvedValue(3);

    await expect(useCase.execute("charity_001", "admin_001"))
      .rejects.toThrow("Không thể xóa tài khoản");
  });

  it("should throw error mentioning the usage count", async () => {
    uow.charityAccounts.findById.mockResolvedValue(
      buildCharityAccount({ name: "My Charity", usageCount: 5 })
    );
    uow.charityAccounts.getUsageCount.mockResolvedValue(5);

    await expect(useCase.execute("charity_001", "admin_001"))
      .rejects.toThrow("My Charity");
  });

  it("should delete account when not in use", async () => {
    uow.charityAccounts.findById.mockResolvedValue(buildCharityAccount());
    uow.charityAccounts.getUsageCount.mockResolvedValue(0);
    uow.charityAccounts.delete.mockResolvedValue(undefined);

    await useCase.execute("charity_001", "admin_001");

    expect(uow.charityAccounts.delete).toHaveBeenCalledWith("charity_001");
  });

  it("should create audit log on deletion", async () => {
    uow.charityAccounts.findById.mockResolvedValue(buildCharityAccount());
    uow.charityAccounts.getUsageCount.mockResolvedValue(0);
    uow.charityAccounts.delete.mockResolvedValue(undefined);

    await useCase.execute("charity_001", "admin_001");

    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CHARITY_ACCOUNT_DELETED",
        performedBy: "admin_001",
        oldValues: expect.objectContaining({
          accountId: "charity_001",
          name: "Quy Thien Nguyen",
          accountNo: "2000",
        }),
      })
    );
  });
});
