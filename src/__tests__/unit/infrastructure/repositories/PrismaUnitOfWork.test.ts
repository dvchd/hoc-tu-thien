// ─── PrismaUnitOfWork Unit Tests ──────────────────────────────────────────────
import { PrismaUnitOfWork } from "@/infrastructure/unit-of-work/PrismaUnitOfWork";
import { PrismaUserRepository } from "@/infrastructure/database/repositories/PrismaUserRepository";
import { PrismaPaymentRepository } from "@/infrastructure/database/repositories/payment/PrismaPaymentRepository";
import { PrismaSessionRepository } from "@/infrastructure/database/repositories/session/PrismaSessionRepository";
import { PrismaTeachingFieldRepository } from "@/infrastructure/database/repositories/teaching-field/PrismaTeachingFieldRepository";
import { PrismaMentorApplicationRepository } from "@/infrastructure/database/repositories/PrismaMentorApplicationRepository";
import { PrismaCharityAccountRepository } from "@/infrastructure/database/repositories/PrismaCharityAccountRepository";
import { PrismaSystemConfigRepository } from "@/infrastructure/database/repositories/PrismaSystemConfigRepository";
import { PrismaReportRepository } from "@/infrastructure/database/repositories/PrismaReportRepository";
import { PrismaMentorProfileRepository } from "@/infrastructure/database/repositories/PrismaMentorProfileRepository";

function makePrisma() {
  return {
    $transaction: jest.fn(),
  } as any;
}

describe("PrismaUnitOfWork", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let uow: PrismaUnitOfWork;

  beforeEach(() => {
    prisma = makePrisma();
    uow = new PrismaUnitOfWork(prisma);
  });

  // ── Repository accessors (lazy init) ─────────────────────────────────────

  it("lazily creates PrismaUserRepository on first access", () => {
    const repo = uow.users;
    expect(repo).toBeInstanceOf(PrismaUserRepository);
    // Second access returns same instance
    expect(uow.users).toBe(repo);
  });

  it("lazily creates PrismaPaymentRepository", () => {
    expect(uow.payments).toBeInstanceOf(PrismaPaymentRepository);
    expect(uow.payments).toBe(uow.payments);
  });

  it("lazily creates PrismaSessionRepository", () => {
    expect(uow.sessions).toBeInstanceOf(PrismaSessionRepository);
  });

  it("lazily creates PrismaTeachingFieldRepository", () => {
    expect(uow.teachingFields).toBeInstanceOf(PrismaTeachingFieldRepository);
  });

  it("lazily creates PrismaMentorApplicationRepository", () => {
    expect(uow.mentorApplications).toBeInstanceOf(PrismaMentorApplicationRepository);
  });

  it("lazily creates PrismaCharityAccountRepository", () => {
    expect(uow.charityAccounts).toBeInstanceOf(PrismaCharityAccountRepository);
  });

  it("lazily creates PrismaSystemConfigRepository", () => {
    expect(uow.systemConfig).toBeInstanceOf(PrismaSystemConfigRepository);
  });

  it("lazily creates PrismaReportRepository", () => {
    expect(uow.reports).toBeInstanceOf(PrismaReportRepository);
  });

  it("lazily creates PrismaMentorProfileRepository", () => {
    expect(uow.mentorProfiles).toBeInstanceOf(PrismaMentorProfileRepository);
  });

  // ── begin / commit / rollback ─────────────────────────────────────────────

  it("begin resolves without error", async () => {
    await expect(uow.begin()).resolves.toBeUndefined();
  });

  it("commit resolves without error", async () => {
    await expect(uow.commit()).resolves.toBeUndefined();
  });

  it("rollback resolves without error", async () => {
    await expect(uow.rollback()).resolves.toBeUndefined();
  });

  // ── execute ───────────────────────────────────────────────────────────────

  it("execute uses $transaction and returns work result", async () => {
    prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      // simulate tx client
      const tx = { $transaction: jest.fn() };
      return fn(tx);
    });

    const result = await uow.execute(async (txUow) => {
      // txUow is a TransactionalUnitOfWork — should expose repositories
      expect(txUow.users).toBeInstanceOf(PrismaUserRepository);
      expect(txUow.payments).toBeInstanceOf(PrismaPaymentRepository);
      expect(txUow.sessions).toBeInstanceOf(PrismaSessionRepository);
      expect(txUow.teachingFields).toBeInstanceOf(PrismaTeachingFieldRepository);
      expect(txUow.mentorApplications).toBeInstanceOf(PrismaMentorApplicationRepository);
      expect(txUow.charityAccounts).toBeInstanceOf(PrismaCharityAccountRepository);
      expect(txUow.systemConfig).toBeInstanceOf(PrismaSystemConfigRepository);
      expect(txUow.reports).toBeInstanceOf(PrismaReportRepository);
      expect(txUow.mentorProfiles).toBeInstanceOf(PrismaMentorProfileRepository);
      return 42;
    });

    expect(result).toBe(42);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("TransactionalUnitOfWork.execute calls work directly (no nested tx)", async () => {
    prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = { $transaction: jest.fn() };
      return fn(tx);
    });

    let innerTxUow: any;
    await uow.execute(async (txUow) => {
      innerTxUow = txUow;
      return null;
    });

    // TransactionalUnitOfWork.execute should call the work fn directly
    const innerResult = await innerTxUow.execute(async (u: any) => {
      expect(u).toBe(innerTxUow);
      return "inner";
    });
    expect(innerResult).toBe("inner");
  });

  it("TransactionalUnitOfWork begin/commit/rollback resolve without error", async () => {
    prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      return fn({});
    });

    await uow.execute(async (txUow) => {
      await expect(txUow.begin()).resolves.toBeUndefined();
      await expect(txUow.commit()).resolves.toBeUndefined();
      await expect(txUow.rollback()).resolves.toBeUndefined();
      return null;
    });
  });
});
