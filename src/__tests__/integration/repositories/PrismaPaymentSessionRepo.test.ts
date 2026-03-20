/**
 * Integration tests for PrismaPaymentRepository and PrismaSessionRepository
 *
 * Uses a separate test SQLite database.
 * All tests run sequentially (--runInBand) to avoid DB conflicts.
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import {
  PrismaPaymentRepository,
  PrismaSessionRepository,
} from "@/infrastructure/database/repositories/PrismaPaymentSessionRepositories";
import { PaymentType, PaymentStatus, SessionStatus } from "@/domain/value-objects/Payment";

let prisma: PrismaClient;
const TEST_DB = "file:./test_payment_session.db";

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: TEST_DB } } });

  execSync("npx prisma db push --schema=./prisma/schema.prisma --force-reset", {
    env: { ...process.env, DATABASE_URL: TEST_DB.replace("file:", "file:") },
    stdio: "ignore",
  });

  await prisma.$connect();

  // Seed base users needed for FK constraints
  await prisma.user.createMany({
    data: [
      { id: "mentee_test", email: "mentee@test.com", role: "MENTEE", status: "ACTIVE", version: 1 },
      { id: "mentor_test", email: "mentor@test.com", role: "MENTOR", status: "ACTIVE", version: 1 },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  try {
    const fs = await import("fs");
    fs.unlinkSync(TEST_DB.replace("file:./", "./"));
  } catch {}
});

beforeEach(async () => {
  await prisma.paymentVerificationLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.learningSession.deleteMany();
});

// ─── PrismaPaymentRepository ──────────────────────────────────────────────────

describe("PrismaPaymentRepository (integration)", () => {
  function makeRepo() {
    return new PrismaPaymentRepository(prisma);
  }

  function makePaymentInput(overrides: Partial<any> = {}) {
    return {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: "mentee_test",
      type: PaymentType.ACTIVATION,
      amount: 10000,
      transactionCode: `HOCTUTHIEN KICHHOAT ${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      shortCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      tnAccountNo: "2000",
      tnAccountName: "QUY THIEN NGUYEN",
      expiresAt: new Date(Date.now() + 86400000),
      ...overrides,
    };
  }

  describe("create()", () => {
    it("persists a payment and returns the record", async () => {
      const repo = makeRepo();
      const input = makePaymentInput();

      const result = await repo.create(input);

      expect(result.id).toBe(input.id);
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.amount).toBe(10000);
      expect(result.shortCode).toBe(input.shortCode);
    });

    it("throws on duplicate transactionCode", async () => {
      const repo = makeRepo();
      const input = makePaymentInput({ transactionCode: "UNIQUE_CODE" });

      await repo.create(input);

      await expect(
        repo.create({ ...input, id: "different_id" })
      ).rejects.toThrow();
    });
  });

  describe("findById()", () => {
    it("retrieves a payment by ID", async () => {
      const repo = makeRepo();
      const input = makePaymentInput();
      await repo.create(input);

      const found = await repo.findById(input.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(input.id);
    });

    it("returns null for unknown ID", async () => {
      const repo = makeRepo();
      const result = await repo.findById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("findPendingByUserId()", () => {
    it("returns pending payments for a user", async () => {
      const repo = makeRepo();
      await repo.create(makePaymentInput());
      await repo.create(makePaymentInput());

      const pending = await repo.findPendingByUserId("mentee_test");
      expect(pending.length).toBeGreaterThanOrEqual(2);
    });

    it("filters by type when provided", async () => {
      const repo = makeRepo();
      await repo.create(makePaymentInput({ type: PaymentType.ACTIVATION }));
      await repo.create(makePaymentInput({ type: PaymentType.SESSION_FEE }));

      const activations = await repo.findPendingByUserId(
        "mentee_test",
        PaymentType.ACTIVATION
      );

      expect(
        activations.every((p) => p.type === PaymentType.ACTIVATION)
      ).toBe(true);
    });
  });

  describe("updateStatus()", () => {
    it("updates payment to VERIFIED with transaction details", async () => {
      const repo = makeRepo();
      const input = makePaymentInput();
      const created = await repo.create(input);

      const updated = await repo.updateStatus(created.id, PaymentStatus.VERIFIED, {
        tnTransactionId: "tn_tx_999",
        tnRefId: "FT99999",
        verifiedAmount: 10000,
        verifiedBy: "system",
      });

      expect(updated.status).toBe(PaymentStatus.VERIFIED);
      expect(updated.tnTransactionId).toBe("tn_tx_999");
      expect(updated.verifiedAt).not.toBeNull();
    });

    it("updates payment to FAILED", async () => {
      const repo = makeRepo();
      const input = makePaymentInput();
      const created = await repo.create(input);

      const updated = await repo.updateStatus(created.id, PaymentStatus.FAILED);
      expect(updated.status).toBe(PaymentStatus.FAILED);
    });
  });

  describe("incrementCheckCount()", () => {
    it("increments checkCount and updates lastCheckedAt", async () => {
      const repo = makeRepo();
      const input = makePaymentInput();
      const created = await repo.create(input);

      const before = new Date();
      await repo.incrementCheckCount(created.id, new Date());

      const row = await prisma.payment.findUnique({ where: { id: created.id } });
      expect(row!.checkCount).toBe(1);
      expect(row!.lastCheckedAt).not.toBeNull();
      expect(row!.lastCheckedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe("logVerification()", () => {
    it("creates a verification log entry", async () => {
      const repo = makeRepo();
      const input = makePaymentInput();
      const created = await repo.create(input);

      await repo.logVerification({
        paymentId: created.id,
        found: false,
        apiResponse: JSON.stringify({ status: 200, data: { transactions: [] } }),
      });

      const logs = await prisma.paymentVerificationLog.findMany({
        where: { paymentId: created.id },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].found).toBe(false);
    });
  });
});

// ─── PrismaSessionRepository ──────────────────────────────────────────────────

describe("PrismaSessionRepository (integration)", () => {
  function makeRepo() {
    return new PrismaSessionRepository(prisma);
  }

  function makeSessionInput(overrides: Partial<any> = {}) {
    return {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      menteeId: "mentee_test",
      mentorId: "mentor_test",
      title: "Học ReactJS",
      scheduledAt: new Date(Date.now() + 86400000),
      durationMinutes: 60,
      fee: 0,
      createdBy: "mentee_test",
      ...overrides,
    };
  }

  describe("create()", () => {
    it("persists a session with PENDING status", async () => {
      const repo = makeRepo();
      const input = makeSessionInput();

      const result = await repo.create(input);

      expect(result.id).toBe(input.id);
      expect(result.status).toBe(SessionStatus.PENDING);
      expect(result.title).toBe("Học ReactJS");
      expect(result.version).toBe(1);
    });
  });

  describe("findById()", () => {
    it("retrieves a session by ID", async () => {
      const repo = makeRepo();
      const input = makeSessionInput();
      await repo.create(input);

      const found = await repo.findById(input.id);
      expect(found!.id).toBe(input.id);
      expect(found!.menteeId).toBe("mentee_test");
    });
  });

  describe("updateStatus()", () => {
    it("confirms session and sets meetLink", async () => {
      const repo = makeRepo();
      const session = await repo.create(makeSessionInput());

      const updated = await repo.updateStatus(
        session.id,
        SessionStatus.CONFIRMED,
        { meetLink: "https://meet.google.com/abc-xyz", meetId: "abc-xyz" }
      );

      expect(updated.status).toBe(SessionStatus.CONFIRMED);
      expect(updated.meetLink).toBe("https://meet.google.com/abc-xyz");
      expect(updated.version).toBe(2);
    });

    it("cancels session with reason", async () => {
      const repo = makeRepo();
      const session = await repo.create(makeSessionInput());

      const updated = await repo.updateStatus(
        session.id,
        SessionStatus.CANCELLED,
        { cancelReason: "Lịch bận", cancelledBy: "mentee_test" }
      );

      expect(updated.status).toBe(SessionStatus.CANCELLED);
      expect(updated.cancelReason).toBe("Lịch bận");
    });

    it("marks session as PAYMENT_PENDING for paid sessions", async () => {
      const repo = makeRepo();
      const session = await repo.create(makeSessionInput({ fee: 200000 }));

      const updated = await repo.updateStatus(session.id, SessionStatus.PAYMENT_PENDING);
      expect(updated.status).toBe(SessionStatus.PAYMENT_PENDING);
      expect(updated.endAt).not.toBeNull();
    });
  });

  describe("addRating()", () => {
    it("saves rating and comment", async () => {
      const repo = makeRepo();
      const session = await repo.create(makeSessionInput());
      await repo.updateStatus(session.id, SessionStatus.COMPLETED);

      const rated = await repo.addRating(session.id, 5, "Mentor tuyệt vời!");

      expect(rated.rating).toBe(5);
      expect(rated.ratingComment).toBe("Mentor tuyệt vời!");
    });
  });

  describe("findPendingPaymentByMenteeId()", () => {
    it("returns null when no pending payment session", async () => {
      const repo = makeRepo();
      const result = await repo.findPendingPaymentByMenteeId("mentee_test");
      expect(result).toBeNull();
    });

    it("returns session in PAYMENT_PENDING status", async () => {
      const repo = makeRepo();
      const session = await repo.create(makeSessionInput({ fee: 100000 }));
      await repo.updateStatus(session.id, SessionStatus.PAYMENT_PENDING);

      const found = await repo.findPendingPaymentByMenteeId("mentee_test");
      expect(found).not.toBeNull();
      expect(found!.status).toBe(SessionStatus.PAYMENT_PENDING);
    });
  });

  describe("findByMenteeId() and findByMentorId()", () => {
    it("returns sessions for a specific mentee", async () => {
      const repo = makeRepo();
      await repo.create(makeSessionInput());
      await repo.create(makeSessionInput());

      const sessions = await repo.findByMenteeId("mentee_test");
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.every((s) => s.menteeId === "mentee_test")).toBe(true);
    });

    it("returns sessions for a specific mentor", async () => {
      const repo = makeRepo();
      await repo.create(makeSessionInput());

      const sessions = await repo.findByMentorId("mentor_test");
      expect(sessions.length).toBeGreaterThanOrEqual(1);
      expect(sessions.every((s) => s.mentorId === "mentor_test")).toBe(true);
    });
  });

  describe("getTopMentors() and getTopMentees()", () => {
    it("returns empty arrays when no completed sessions for the month", async () => {
      const repo = makeRepo();
      const topMentors = await repo.getTopMentors(1, 2000); // year 2000 = no data
      expect(topMentors).toEqual([]);
    });

    it("returns leaderboard entries for completed sessions", async () => {
      const repo = makeRepo();
      const now = new Date();

      // Create and complete sessions this month
      for (let i = 0; i < 3; i++) {
        const session = await repo.create(
          makeSessionInput({
            scheduledAt: new Date(now.getFullYear(), now.getMonth(), 15),
            fee: 100000,
          })
        );
        await repo.updateStatus(session.id, SessionStatus.COMPLETED);
      }

      const topMentors = await repo.getTopMentors(
        now.getMonth() + 1,
        now.getFullYear()
      );

      expect(topMentors.length).toBeGreaterThanOrEqual(1);
      expect(topMentors[0].sessionCount).toBeGreaterThanOrEqual(3);
      expect(topMentors[0].userId).toBe("mentor_test");
    });
  });
});
