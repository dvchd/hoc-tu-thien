// ─── PrismaPaymentRepository Unit Tests ──────────────────────────────────────
import { PrismaPaymentRepository } from "@/infrastructure/database/repositories/payment/PrismaPaymentRepository";
import { PaymentStatus, PaymentType } from "@/domain/value-objects/Payment";

function makePrisma() {
  return {
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentVerificationLog: {
      create: jest.fn(),
    },
  } as any;
}

const paymentRow = {
  id: "pay_001",
  userId: "u1",
  sessionId: null,
  type: "ACTIVATION",
  status: "PENDING",
  amount: 10000,
  transactionCode: "HOCTUTHIEN KICHHOAT ABCDEF",
  shortCode: "ABCDEF",
  tnAccountNo: "2000",
  tnAccountName: "QUY THIEN NGUYEN",
  tnTransactionId: null,
  tnRefId: null,
  verifiedAt: null,
  verifiedAmount: null,
  verifiedBy: null,
  expiresAt: new Date(Date.now() + 86400000),
  lastCheckedAt: null,
  checkCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false,
  version: 1,
};

describe("PrismaPaymentRepository", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: PrismaPaymentRepository;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaPaymentRepository(prisma);
  });

  describe("findById", () => {
    it("returns payment record when found", async () => {
      prisma.payment.findUnique.mockResolvedValue(paymentRow);
      const result = await repo.findById("pay_001");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("pay_001");
      expect(result!.type).toBe(PaymentType.ACTIVATION);
    });

    it("returns null when not found", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      expect(await repo.findById("missing")).toBeNull();
    });
  });

  describe("findByShortCode", () => {
    it("returns payment when found", async () => {
      prisma.payment.findFirst.mockResolvedValue(paymentRow);
      const result = await repo.findByShortCode("ABCDEF");
      expect(result!.shortCode).toBe("ABCDEF");
    });

    it("returns null when not found", async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      expect(await repo.findByShortCode("XXXXXX")).toBeNull();
    });
  });

  describe("findPendingByUserId", () => {
    it("returns pending payments without type filter", async () => {
      prisma.payment.findMany.mockResolvedValue([paymentRow]);
      const result = await repo.findPendingByUserId("u1");
      expect(result).toHaveLength(1);
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "PENDING" }) })
      );
    });

    it("filters by type when provided", async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      await repo.findPendingByUserId("u1", PaymentType.ACTIVATION);
      const call = prisma.payment.findMany.mock.calls[0][0];
      expect(call.where.type).toBe("ACTIVATION");
    });
  });

  describe("findByUserId", () => {
    it("returns payments ordered by createdAt desc", async () => {
      prisma.payment.findMany.mockResolvedValue([paymentRow]);
      const result = await repo.findByUserId("u1");
      expect(result).toHaveLength(1);
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1" },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      );
    });

    it("respects custom limit", async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      await repo.findByUserId("u1", 5);
      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  describe("create", () => {
    it("creates and returns payment record with PENDING status", async () => {
      prisma.payment.create.mockResolvedValue(paymentRow);
      const result = await repo.create({
        id: "pay_001",
        userId: "u1",
        sessionId: null,
        type: PaymentType.ACTIVATION,
        amount: 10000,
        transactionCode: "HOCTUTHIEN KICHHOAT ABCDEF",
        shortCode: "ABCDEF",
        tnAccountNo: "2000",
        tnAccountName: "QUY THIEN NGUYEN",
        expiresAt: new Date(Date.now() + 86400000),
      });
      expect(result.id).toBe("pay_001");
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PENDING", version: 1 }),
        })
      );
    });
  });

  describe("updateStatus", () => {
    it("updates status and sets verifiedAt for VERIFIED", async () => {
      prisma.payment.update.mockResolvedValue({ ...paymentRow, status: "VERIFIED" });
      const result = await repo.updateStatus("pay_001", PaymentStatus.VERIFIED, {
        tnTransactionId: "TXN123",
        verifiedAmount: 10000,
        verifiedBy: "admin",
      });
      expect(result.status).toBe(PaymentStatus.VERIFIED);
      const data = prisma.payment.update.mock.calls[0][0].data;
      expect(data.verifiedAt).toBeInstanceOf(Date);
    });

    it("does not set verifiedAt for non-VERIFIED status", async () => {
      prisma.payment.update.mockResolvedValue({ ...paymentRow, status: "EXPIRED" });
      await repo.updateStatus("pay_001", PaymentStatus.EXPIRED);
      const data = prisma.payment.update.mock.calls[0][0].data;
      expect(data.verifiedAt).toBeUndefined();
    });
  });

  describe("incrementCheckCount", () => {
    it("increments checkCount and sets lastCheckedAt", async () => {
      prisma.payment.update.mockResolvedValue(paymentRow);
      const now = new Date();
      await repo.incrementCheckCount("pay_001", now);
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { checkCount: { increment: 1 }, lastCheckedAt: now },
        })
      );
    });
  });

  describe("logVerification", () => {
    it("creates verification log entry", async () => {
      prisma.paymentVerificationLog.create.mockResolvedValue({});
      await repo.logVerification({
        paymentId: "pay_001",
        found: true,
        apiResponse: '{"ok":true}',
      });
      expect(prisma.paymentVerificationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paymentId: "pay_001", found: true }),
        })
      );
    });

    it("creates verification log with error", async () => {
      prisma.paymentVerificationLog.create.mockResolvedValue({});
      await repo.logVerification({ paymentId: "pay_001", found: false, error: "timeout" });
      expect(prisma.paymentVerificationLog.create).toHaveBeenCalled();
    });
  });
});
