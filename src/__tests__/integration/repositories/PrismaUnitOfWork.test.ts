/**
 * Integration tests for PrismaUnitOfWork
 *
 * Verifies that:
 * 1. execute() wraps all work in a single transaction
 * 2. A thrown error inside execute() rolls back all changes
 * 3. Multiple repositories share the same transaction client
 *
 * Uses real PostgreSQL (DATABASE_URL from .env).
 */

import { PrismaClient } from "@prisma/client";
import { PrismaUnitOfWork } from "@/infrastructure/unit-of-work/PrismaUnitOfWork";
import { UserEntity } from "@/domain/entities/User";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";

let prisma: PrismaClient;

const TEST_PREFIX = `inttest_uow_${Date.now()}_`;

beforeAll(async () => {
  prisma = new PrismaClient();
  await prisma.$connect();
});

afterAll(async () => {
  // Cleanup data tạo bởi test suite này
  await prisma.userAuditLog.deleteMany({ where: { userId: { startsWith: TEST_PREFIX } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
  await prisma.$disconnect();
});

function makeUser(suffix: string, role = UserRole.MENTEE) {
  const rand = Math.random().toString(36).slice(2, 6);
  return UserEntity.create({
    id: `${TEST_PREFIX}${rand}`,
    email: `${TEST_PREFIX}${suffix}_${rand}@test.com`,
    status: UserStatus.ACTIVE,
    role,
  });
}

describe("PrismaUnitOfWork", () => {
  describe("execute() - happy path", () => {
    it("commits all changes when work succeeds", async () => {
      const uow = new PrismaUnitOfWork(prisma);
      const user = makeUser("commit");

      await uow.execute(async (u) => {
        await u.users.save(user);
        await u.users.createAuditLog({
          userId: user.id,
          action: "CREATED",
          performedBy: "test",
        });
      });

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const logs = await prisma.userAuditLog.findMany({ where: { userId: user.id } });

      expect(dbUser).not.toBeNull();
      expect(logs).toHaveLength(1);
    });

    it("all repositories within execute() see the same transaction", async () => {
      const uow = new PrismaUnitOfWork(prisma);
      const user = makeUser("sharedtx");

      await uow.execute(async (u) => {
        await u.users.save(user);
        // Within same TX: should be able to find the just-saved user
        const found = await u.users.findById(user.id);
        expect(found).not.toBeNull();
      });
    });
  });

  describe("execute() - rollback on error", () => {
    it("rolls back user save when an error is thrown", async () => {
      const uow = new PrismaUnitOfWork(prisma);
      const user = makeUser("rollback");

      await expect(
        uow.execute(async (u) => {
          await u.users.save(user);
          throw new Error("Something went wrong — should rollback");
        })
      ).rejects.toThrow("Something went wrong");

      // User should NOT be in the DB
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser).toBeNull();
    });

    it("rolls back partial work (save + audit log) on error", async () => {
      const uow = new PrismaUnitOfWork(prisma);
      const user = makeUser("partial");

      await expect(
        uow.execute(async (u) => {
          await u.users.save(user);
          await u.users.createAuditLog({ userId: user.id, action: "PARTIAL", performedBy: "test" });
          throw new Error("Partial failure");
        })
      ).rejects.toThrow();

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const logs = await prisma.userAuditLog.findMany({ where: { userId: user.id } });

      expect(dbUser).toBeNull();
      expect(logs).toHaveLength(0);
    });
  });

  describe("nested execute() calls", () => {
    it("treats nested execute as the same transaction", async () => {
      const uow = new PrismaUnitOfWork(prisma);
      const user = makeUser("nested");

      await uow.execute(async (u) => {
        await u.execute(async (inner) => {
          await inner.users.save(user);
        });
        // Should be visible in outer scope too
        const found = await u.users.findById(user.id);
        expect(found).not.toBeNull();
      });

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser).not.toBeNull();
    });
  });

  describe("optimistic concurrency via update()", () => {
    it("prevents stale update when version is wrong", async () => {
      const uow = new PrismaUnitOfWork(prisma);
      const user = makeUser("optlock");
      await uow.users.save(user);

      // Simulate another process updating the user
      await prisma.user.update({
        where: { id: user.id },
        data: { version: 99 },
      });

      // Now try to update with original version (1 → 2)
      const staleUpdate = user.updateProfile({ name: "Stale" });
      await expect(uow.users.update(staleUpdate)).rejects.toThrow(
        "Concurrency conflict"
      );
    });
  });
});
