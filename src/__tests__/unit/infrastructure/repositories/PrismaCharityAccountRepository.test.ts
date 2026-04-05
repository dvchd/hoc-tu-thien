// ─── PrismaCharityAccountRepository Unit Tests ───────────────────────────────
import { PrismaCharityAccountRepository } from "@/infrastructure/database/repositories/PrismaCharityAccountRepository";
import { CharityAccountVerificationStatus } from "@/domain/value-objects/Payment";

function makePrisma() {
  return {
    charityAccount: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    mentorProfile: {
      count: jest.fn(),
    },
    payment: {
      count: jest.fn(),
    },
  } as any;
}

const accountRow = {
  id: "acc_001",
  name: "Quỹ Thiện Nguyện",
  accountNo: "2000",
  bankName: "MB Bank",
  campaignKeyword: "HOCTUTHIEN",
  description: null,
  isActive: true,
  isDefault: true,
  usageCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "admin",
  isDeleted: false,
  deletedAt: null,
  verificationStatus: "UNVERIFIED",
  verificationPaymentId: null,
  verificationShortCode: null,
  verifiedAt: null,
  verifiedBy: null,
  verificationNote: null,
};

describe("PrismaCharityAccountRepository", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: PrismaCharityAccountRepository;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaCharityAccountRepository(prisma);
  });

  describe("findById", () => {
    it("returns charity account record when found", async () => {
      prisma.charityAccount.findUnique.mockResolvedValue(accountRow);
      const result = await repo.findById("acc_001");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("acc_001");
      expect(result!.verificationStatus).toBe(CharityAccountVerificationStatus.UNVERIFIED);
    });

    it("returns null when not found", async () => {
      prisma.charityAccount.findUnique.mockResolvedValue(null);
      expect(await repo.findById("missing")).toBeNull();
    });
  });

  describe("findByAccountNo", () => {
    it("returns account when found", async () => {
      prisma.charityAccount.findUnique.mockResolvedValue(accountRow);
      const result = await repo.findByAccountNo("2000");
      expect(result!.accountNo).toBe("2000");
    });

    it("returns null when not found", async () => {
      prisma.charityAccount.findUnique.mockResolvedValue(null);
      expect(await repo.findByAccountNo("9999")).toBeNull();
    });
  });

  describe("findAll", () => {
    it("excludes deleted by default", async () => {
      prisma.charityAccount.findMany.mockResolvedValue([accountRow]);
      await repo.findAll();
      const call = prisma.charityAccount.findMany.mock.calls[0][0];
      expect(call.where.isDeleted).toBe(false);
    });

    it("includes deleted when includeDeleted=true", async () => {
      prisma.charityAccount.findMany.mockResolvedValue([]);
      await repo.findAll({ includeDeleted: true });
      const call = prisma.charityAccount.findMany.mock.calls[0][0];
      expect(call.where.isDeleted).toBeUndefined();
    });

    it("filters by isActive", async () => {
      prisma.charityAccount.findMany.mockResolvedValue([]);
      await repo.findAll({ isActive: true });
      const call = prisma.charityAccount.findMany.mock.calls[0][0];
      expect(call.where.isActive).toBe(true);
    });

    it("maps to CharityAccountRecord array", async () => {
      prisma.charityAccount.findMany.mockResolvedValue([accountRow, accountRow]);
      const result = await repo.findAll();
      expect(result).toHaveLength(2);
    });
  });

  describe("findDefault", () => {
    it("returns default active account", async () => {
      prisma.charityAccount.findFirst.mockResolvedValue(accountRow);
      const result = await repo.findDefault();
      expect(result!.isDefault).toBe(true);
      expect(prisma.charityAccount.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDefault: true, isActive: true, isDeleted: false },
        })
      );
    });

    it("returns null when no default", async () => {
      prisma.charityAccount.findFirst.mockResolvedValue(null);
      expect(await repo.findDefault()).toBeNull();
    });
  });

  describe("create", () => {
    it("creates account with UNVERIFIED status", async () => {
      prisma.charityAccount.create.mockResolvedValue(accountRow);
      const result = await repo.create({
        name: "Quỹ Thiện Nguyện",
        accountNo: "2000",
        bankName: "MB Bank",
        isDefault: true,
        createdBy: "admin",
      });
      expect(result.id).toBe("acc_001");
      const data = prisma.charityAccount.create.mock.calls[0][0].data;
      expect(data.verificationStatus).toBe(CharityAccountVerificationStatus.UNVERIFIED);
      expect(data.isActive).toBe(true);
      expect(data.usageCount).toBe(0);
    });

    it("uses MB Bank as default bankName", async () => {
      prisma.charityAccount.create.mockResolvedValue(accountRow);
      await repo.create({ name: "Test", accountNo: "1111" });
      const data = prisma.charityAccount.create.mock.calls[0][0].data;
      expect(data.bankName).toBe("MB Bank");
    });
  });

  describe("update", () => {
    it("updates only provided fields", async () => {
      prisma.charityAccount.update.mockResolvedValue({ ...accountRow, name: "New Name" });
      const result = await repo.update("acc_001", { name: "New Name" });
      expect(result.name).toBe("New Name");
      const data = prisma.charityAccount.update.mock.calls[0][0].data;
      expect(data.name).toBe("New Name");
    });

    it("updates isActive field", async () => {
      prisma.charityAccount.update.mockResolvedValue({ ...accountRow, isActive: false });
      await repo.update("acc_001", { isActive: false });
      const data = prisma.charityAccount.update.mock.calls[0][0].data;
      expect(data.isActive).toBe(false);
    });
  });

  describe("deactivate", () => {
    it("sets isActive=false", async () => {
      prisma.charityAccount.update.mockResolvedValue(accountRow);
      await repo.deactivate("acc_001");
      expect(prisma.charityAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "acc_001" },
          data: expect.objectContaining({ isActive: false }),
        })
      );
    });
  });

  describe("delete", () => {
    it("throws when account has usage", async () => {
      // findById returns account
      prisma.charityAccount.findUnique.mockResolvedValue(accountRow);
      // mentorProfile.count = 2, payment.count = 1
      prisma.mentorProfile.count.mockResolvedValue(2);
      prisma.payment.count.mockResolvedValue(1);
      await expect(repo.delete("acc_001")).rejects.toThrow("Không thể xóa");
    });

    it("deletes when usage count is 0", async () => {
      prisma.charityAccount.findUnique.mockResolvedValue(accountRow);
      prisma.mentorProfile.count.mockResolvedValue(0);
      prisma.payment.count.mockResolvedValue(0);
      prisma.charityAccount.delete.mockResolvedValue(accountRow);
      await repo.delete("acc_001");
      expect(prisma.charityAccount.delete).toHaveBeenCalledWith({ where: { id: "acc_001" } });
    });

    it("returns 0 usage when account not found", async () => {
      prisma.charityAccount.findUnique.mockResolvedValue(null);
      prisma.charityAccount.delete.mockResolvedValue(accountRow);
      // getUsageCount returns 0 when not found → delete proceeds
      await repo.delete("acc_001");
      expect(prisma.charityAccount.delete).toHaveBeenCalled();
    });
  });

  describe("getUsageCount", () => {
    it("returns 0 when account not found", async () => {
      prisma.charityAccount.findUnique.mockResolvedValue(null);
      expect(await repo.getUsageCount("missing")).toBe(0);
    });

    it("returns sum of mentorCount and paymentCount", async () => {
      prisma.charityAccount.findUnique.mockResolvedValue(accountRow);
      prisma.mentorProfile.count.mockResolvedValue(3);
      prisma.payment.count.mockResolvedValue(7);
      expect(await repo.getUsageCount("acc_001")).toBe(10);
    });
  });

  describe("clearDefault", () => {
    it("sets all isDefault to false", async () => {
      prisma.charityAccount.updateMany.mockResolvedValue({ count: 1 });
      await repo.clearDefault();
      expect(prisma.charityAccount.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe("updateVerificationStatus", () => {
    it("updates status with all opts", async () => {
      const updated = { ...accountRow, verificationStatus: "VERIFIED" };
      prisma.charityAccount.update.mockResolvedValue(updated);
      const result = await repo.updateVerificationStatus("acc_001", "VERIFIED", {
        verificationPaymentId: "pay_001",
        verificationShortCode: "ABC123",
        verifiedAt: new Date(),
        verifiedBy: "admin",
        verificationNote: "OK",
      });
      expect(result.verificationStatus).toBe("VERIFIED");
    });

    it("updates status without opts", async () => {
      prisma.charityAccount.update.mockResolvedValue(accountRow);
      await repo.updateVerificationStatus("acc_001", "PENDING_VERIFICATION");
      expect(prisma.charityAccount.update).toHaveBeenCalled();
    });
  });
});
