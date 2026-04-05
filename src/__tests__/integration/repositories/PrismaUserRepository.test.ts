/**
 * Integration tests for PrismaUserRepository
 *
 * Uses the real PostgreSQL database (DATABASE_URL from .env).
 * Each test cleans up its own data using unique IDs.
 *
 * Run: npm run test:integration
 */

import { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "@/infrastructure/database/repositories/PrismaUserRepository";
import { UserEntity } from "@/domain/entities/User";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";

// ─── Setup: use real PostgreSQL DB ────────────────────────────────────────────

let prisma: PrismaClient;

// Prefix dùng để tag dữ liệu test — dễ cleanup và không xung đột với data thật
const TEST_PREFIX = `inttest_user_${Date.now()}_`;

beforeAll(async () => {
  prisma = new PrismaClient();
  await prisma.$connect();
});

afterAll(async () => {
  // Cleanup tất cả data được tạo bởi test suite này
  await prisma.userAuditLog.deleteMany({ where: { userId: { startsWith: TEST_PREFIX } } });
  await prisma.payment.deleteMany({ where: { userId: { startsWith: TEST_PREFIX } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
  await prisma.$disconnect();
});

// Không cần beforeEach cleanup — mỗi test dùng ID riêng với TEST_PREFIX

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRepo() {
  return new PrismaUserRepository(prisma);
}

function makeUser(overrides: Partial<Parameters<typeof UserEntity.create>[0]> = {}): UserEntity {
  const rand = Math.random().toString(36).slice(2, 8);
  return UserEntity.create({
    id: `${TEST_PREFIX}${rand}`,
    email: `${TEST_PREFIX}${rand}@example.com`,
    name: "Test User",
    status: UserStatus.ACTIVE,
    ...overrides,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PrismaUserRepository (integration)", () => {
  describe("save() and findById()", () => {
    it("persists a new user and retrieves it by ID", async () => {
      const repo = makeRepo();
      const user = makeUser({ name: "Persisted User" });

      await repo.save(user);
      const found = await repo.findById(user.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(user.id);
      expect(found!.name).toBe("Persisted User");
    });

    it("returns null for non-existent ID", async () => {
      const repo = makeRepo();
      const result = await repo.findById("nonexistent_id");
      expect(result).toBeNull();
    });

    it("persists role correctly", async () => {
      const repo = makeRepo();
      const mentor = makeUser({ role: UserRole.MENTOR });
      await repo.save(mentor);

      const found = await repo.findById(mentor.id);
      expect(found!.role).toBe(UserRole.MENTOR);
    });

    it("persists version as 1 on creation", async () => {
      const repo = makeRepo();
      const user = makeUser();
      await repo.save(user);

      const found = await repo.findById(user.id);
      expect(found!.version).toBe(1);
    });
  });

  describe("findByEmail()", () => {
    it("finds user by email (case-insensitive-like)", async () => {
      const repo = makeRepo();
      const user = makeUser({ email: "find-me@example.com" });
      await repo.save(user);

      const found = await repo.findByEmail("find-me@example.com");
      expect(found).not.toBeNull();
      expect(found!.email.value).toBe("find-me@example.com");
    });

    it("returns null for unknown email", async () => {
      const repo = makeRepo();
      const result = await repo.findByEmail("ghost@example.com");
      expect(result).toBeNull();
    });
  });

  describe("update() with optimistic concurrency", () => {
    it("updates user fields and increments version", async () => {
      const repo = makeRepo();
      const user = makeUser();
      await repo.save(user);

      const updated = user.updateProfile({ name: "Updated Name" }, "system");
      const result = await repo.update(updated);

      expect(result.name).toBe("Updated Name");
      expect(result.version).toBe(2);
    });

    it("throws ConcurrencyException when version is stale", async () => {
      const repo = makeRepo();
      const user = makeUser();
      await repo.save(user);

      // Simulate a concurrent update that already incremented version
      await prisma.user.update({
        where: { id: user.id },
        data: { version: 5 }, // jump version
      });

      const updatedEntity = user.updateProfile({ name: "Stale" });
      await expect(repo.update(updatedEntity)).rejects.toThrow(
        "Concurrency conflict"
      );
    });
  });

  describe("softDelete()", () => {
    it("marks user as deleted without removing from DB", async () => {
      const repo = makeRepo();
      const user = makeUser();
      await repo.save(user);

      await repo.softDelete(user.id, "admin_001");

      // Should not appear in normal findById
      const dbRow = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbRow).not.toBeNull();
      expect(dbRow!.isDeleted).toBe(true);
      expect(dbRow!.deletedBy).toBe("admin_001");
      expect(dbRow!.deletedAt).not.toBeNull();
    });
  });

  describe("findAll()", () => {
    it("returns only non-deleted users by default", async () => {
      const repo = makeRepo();
      const active = makeUser({ email: "active@t.com" });
      const deleted = makeUser({ email: "deleted@t.com" });

      await repo.save(active);
      await repo.save(deleted);
      await repo.softDelete(deleted.id);

      const results = await repo.findAll();
      const ids = results.map((u) => u.id);

      expect(ids).toContain(active.id);
      expect(ids).not.toContain(deleted.id);
    });

    it("includes deleted users when includeDeleted is true", async () => {
      const repo = makeRepo();
      const user = makeUser();
      await repo.save(user);
      await repo.softDelete(user.id);

      const results = await repo.findAll({ includeDeleted: true });
      expect(results.map((u) => u.id)).toContain(user.id);
    });

    it("filters by role", async () => {
      const repo = makeRepo();
      const mentor = makeUser({ email: "mentor_fl@t.com", role: UserRole.MENTOR });
      const mentee = makeUser({ email: "mentee_fl@t.com", role: UserRole.MENTEE });

      await repo.save(mentor);
      await repo.save(mentee);

      const mentors = await repo.findAll({ role: UserRole.MENTOR });
      expect(mentors.every((u) => u.role === UserRole.MENTOR)).toBe(true);
    });

    it("respects pagination (skip/take)", async () => {
      const repo = makeRepo();
      for (let i = 0; i < 5; i++) {
        await repo.save(makeUser({ email: `page${i}@t.com` }));
      }

      const page1 = await repo.findAll({ skip: 0, take: 2 });
      const page2 = await repo.findAll({ skip: 2, take: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      // No overlap
      const p1ids = page1.map((u) => u.id);
      const p2ids = page2.map((u) => u.id);
      expect(p1ids.filter((id) => p2ids.includes(id))).toHaveLength(0);
    });
  });

  describe("count()", () => {
    it("returns correct count of active users", async () => {
      const repo = makeRepo();
      const u1 = makeUser({ email: "c1@t.com" });
      const u2 = makeUser({ email: "c2@t.com" });
      await repo.save(u1);
      await repo.save(u2);

      const count = await repo.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("existsByEmail()", () => {
    it("returns true for existing email", async () => {
      const repo = makeRepo();
      const user = makeUser({ email: "exists@t.com" });
      await repo.save(user);

      expect(await repo.existsByEmail("exists@t.com")).toBe(true);
    });

    it("returns false for non-existing email", async () => {
      const repo = makeRepo();
      expect(await repo.existsByEmail("nope@t.com")).toBe(false);
    });
  });

  describe("createAuditLog()", () => {
    it("persists an audit log entry", async () => {
      const repo = makeRepo();
      const user = makeUser();
      await repo.save(user);

      await repo.createAuditLog({
        userId: user.id,
        action: "TEST_ACTION",
        oldValues: { role: "MENTEE" },
        newValues: { role: "MENTOR" },
        performedBy: "admin_test",
      });

      const logs = await prisma.userAuditLog.findMany({
        where: { userId: user.id },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("TEST_ACTION");
      expect(logs[0].performedBy).toBe("admin_test");

      const newVals = JSON.parse(logs[0].newValues!);
      expect(newVals.role).toBe("MENTOR");
    });
  });

  describe("getUserStats()", () => {
    it("returns correct counts by role", async () => {
      const repo = makeRepo();
      await repo.save(makeUser({ email: "s_mentee@t.com", role: UserRole.MENTEE }));
      await repo.save(makeUser({ email: "s_mentor@t.com", role: UserRole.MENTOR }));
      await repo.save(makeUser({ email: "s_admin@t.com", role: UserRole.ADMIN }));

      const stats = await repo.getUserStats();

      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.byRole[UserRole.MENTEE]).toBeGreaterThanOrEqual(1);
      expect(stats.byRole[UserRole.MENTOR]).toBeGreaterThanOrEqual(1);
      expect(stats.byRole[UserRole.ADMIN]).toBeGreaterThanOrEqual(1);
    });
  });
});
