// ─── PrismaUserRepository Unit Tests ─────────────────────────────────────────
import { PrismaUserRepository } from "@/infrastructure/database/repositories/PrismaUserRepository";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";

function makePrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    menteeProfile: {
      update: jest.fn(),
    },
    userAuditLog: {
      create: jest.fn(),
    },
  } as any;
}

const prismaUserRow = {
  id: "u1",
  email: "test@example.com",
  name: "Test User",
  image: null,
  role: "MENTEE",
  status: "ACTIVE",
  bio: null,
  phone: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  createdBy: "system",
  updatedBy: null,
  deletedAt: null,
  deletedBy: null,
  isDeleted: false,
  version: 1,
  lateCancellationCount: 0,
};

describe("PrismaUserRepository", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: PrismaUserRepository;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaUserRepository(prisma);
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe("findById", () => {
    it("returns domain entity when found", async () => {
      prisma.user.findUnique.mockResolvedValue(prismaUserRow);
      const result = await repo.findById("u1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("u1");
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "u1" } });
    });

    it("returns null when not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await repo.findById("missing");
      expect(result).toBeNull();
    });
  });

  // ── findByEmail ───────────────────────────────────────────────────────────

  describe("findByEmail", () => {
    it("queries with lowercased email", async () => {
      prisma.user.findUnique.mockResolvedValue(prismaUserRow);
      const result = await repo.findByEmail("TEST@EXAMPLE.COM");
      expect(result).not.toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("returns null when not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      expect(await repo.findByEmail("none@none.com")).toBeNull();
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("applies default filter (no deleted)", async () => {
      prisma.user.findMany.mockResolvedValue([prismaUserRow]);
      const result = await repo.findAll();
      expect(result).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isDeleted: false }) })
      );
    });

    it("includes deleted when includeDeleted=true", async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await repo.findAll({ includeDeleted: true });
      const call = prisma.user.findMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty("isDeleted");
    });

    it("filters by role", async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await repo.findAll({ role: UserRole.MENTOR });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ role: "MENTOR" }) })
      );
    });

    it("filters by status", async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await repo.findAll({ status: UserStatus.ACTIVE });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "ACTIVE" }) })
      );
    });

    it("applies search filter with OR", async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await repo.findAll({ search: "Alice" });
      const call = prisma.user.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
      expect(call.where.OR[0].name.contains).toBe("alice");
    });

    it("applies pagination (skip/take)", async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await repo.findAll({ skip: 10, take: 5 });
      const call = prisma.user.findMany.mock.calls[0][0];
      expect(call.skip).toBe(10);
      expect(call.take).toBe(5);
    });
  });

  // ── count ─────────────────────────────────────────────────────────────────

  describe("count", () => {
    it("returns user count", async () => {
      prisma.user.count.mockResolvedValue(42);
      expect(await repo.count()).toBe(42);
    });

    it("filters by role and status", async () => {
      prisma.user.count.mockResolvedValue(5);
      await repo.count({ role: UserRole.ADMIN, status: UserStatus.ACTIVE });
      expect(prisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: "ADMIN", status: "ACTIVE" }),
        })
      );
    });
  });

  // ── getUserStats ──────────────────────────────────────────────────────────

  describe("getUserStats", () => {
    it("returns aggregated stats from parallel counts", async () => {
      prisma.user.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(2)   // admin
        .mockResolvedValueOnce(30)  // mentor
        .mockResolvedValueOnce(68)  // mentee
        .mockResolvedValueOnce(10)  // pending
        .mockResolvedValueOnce(80)  // active
        .mockResolvedValueOnce(5)   // inactive
        .mockResolvedValueOnce(5);  // suspended

      const stats = await repo.getUserStats();
      expect(stats.total).toBe(100);
      expect(stats.byRole[UserRole.ADMIN]).toBe(2);
      expect(stats.byRole[UserRole.MENTOR]).toBe(30);
      expect(stats.byRole[UserRole.MENTEE]).toBe(68);
      expect(stats.byStatus[UserStatus.ACTIVE]).toBe(80);
    });
  });

  // ── existsByEmail ─────────────────────────────────────────────────────────

  describe("existsByEmail", () => {
    it("returns true when count > 0", async () => {
      prisma.user.count.mockResolvedValue(1);
      expect(await repo.existsByEmail("a@b.com")).toBe(true);
    });

    it("returns false when count is 0", async () => {
      prisma.user.count.mockResolvedValue(0);
      expect(await repo.existsByEmail("a@b.com")).toBe(false);
    });
  });

  // ── save ──────────────────────────────────────────────────────────────────

  describe("save", () => {
    it("creates and returns domain entity", async () => {
      prisma.user.create.mockResolvedValue(prismaUserRow);
      const { buildUser } = await import("@/__tests__/helpers");
      const user = buildUser();
      const result = await repo.save(user);
      expect(result.id).toBe("u1");
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("updates and returns entity on success", async () => {
      prisma.user.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue(prismaUserRow);
      const { buildUser } = await import("@/__tests__/helpers");
      const user = buildUser();
      // bump version so optimistic lock uses version-1
      const result = await repo.update(user);
      expect(result.id).toBe("u1");
    });

    it("throws on concurrency conflict (count=0)", async () => {
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      const { buildUser } = await import("@/__tests__/helpers");
      const user = buildUser();
      await expect(repo.update(user)).rejects.toThrow("Concurrency conflict");
    });
  });

  // ── softDelete ────────────────────────────────────────────────────────────

  describe("softDelete", () => {
    it("calls update with isDeleted=true", async () => {
      prisma.user.update.mockResolvedValue(prismaUserRow);
      await repo.softDelete("u1", "admin");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "u1" },
          data: expect.objectContaining({ isDeleted: true, deletedBy: "admin" }),
        })
      );
    });

    it("works without deletedBy argument", async () => {
      prisma.user.update.mockResolvedValue(prismaUserRow);
      await repo.softDelete("u1");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedBy: null }) })
      );
    });
  });

  // ── hardDelete ────────────────────────────────────────────────────────────

  describe("hardDelete", () => {
    it("calls prisma delete", async () => {
      prisma.user.delete.mockResolvedValue(prismaUserRow);
      await repo.hardDelete("u1");
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
    });
  });

  // ── incrementLateCancellation ─────────────────────────────────────────────

  describe("incrementLateCancellation", () => {
    it("increments lateCancellationCount", async () => {
      prisma.user.update.mockResolvedValue(prismaUserRow);
      await repo.incrementLateCancellation("u1");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { lateCancellationCount: { increment: 1 } },
        })
      );
    });
  });

  // ── incrementNoShow ───────────────────────────────────────────────────────

  describe("incrementNoShow", () => {
    it("increments noShowCount on menteeProfile", async () => {
      prisma.menteeProfile.update.mockResolvedValue({});
      await repo.incrementNoShow("u1");
      expect(prisma.menteeProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1" },
          data: { noShowCount: { increment: 1 } },
        })
      );
    });
  });

  // ── createAuditLog ────────────────────────────────────────────────────────

  describe("createAuditLog", () => {
    it("creates audit log entry", async () => {
      prisma.userAuditLog.create.mockResolvedValue({});
      await repo.createAuditLog({
        userId: "u1",
        action: "UPDATE_ROLE",
        oldValues: { role: "MENTEE" },
        newValues: { role: "MENTOR" },
        performedBy: "admin",
        ipAddress: "127.0.0.1",
        userAgent: "jest",
      });
      expect(prisma.userAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: "u1", action: "UPDATE_ROLE" }),
        })
      );
    });

    it("handles missing optional fields", async () => {
      prisma.userAuditLog.create.mockResolvedValue({});
      await repo.createAuditLog({ userId: "u1", action: "LOGIN" });
      expect(prisma.userAuditLog.create).toHaveBeenCalled();
    });
  });
});
