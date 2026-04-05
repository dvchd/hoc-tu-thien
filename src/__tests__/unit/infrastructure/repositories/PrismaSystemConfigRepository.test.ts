// ─── PrismaSystemConfigRepository Unit Tests ─────────────────────────────────
import { PrismaSystemConfigRepository } from "@/infrastructure/database/repositories/PrismaSystemConfigRepository";

function makePrisma() {
  return {
    systemConfig: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  } as any;
}

const configRow = {
  id: "cfg_001",
  key: "activation_fee",
  value: "10000",
  description: "Phí kích hoạt",
  updatedAt: new Date(),
  updatedBy: "admin",
};

describe("PrismaSystemConfigRepository", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: PrismaSystemConfigRepository;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaSystemConfigRepository(prisma);
  });

  describe("get", () => {
    it("returns string value when found", async () => {
      prisma.systemConfig.findUnique.mockResolvedValue(configRow);
      const result = await repo.get("activation_fee");
      expect(result).toBe("10000");
    });

    it("returns null when not found", async () => {
      prisma.systemConfig.findUnique.mockResolvedValue(null);
      expect(await repo.get("missing_key")).toBeNull();
    });
  });

  describe("getNumber", () => {
    it("returns parsed number when valid value", async () => {
      prisma.systemConfig.findUnique.mockResolvedValue(configRow);
      const result = await repo.getNumber("activation_fee", 0);
      expect(result).toBe(10000);
    });

    it("returns fallback when key not found", async () => {
      prisma.systemConfig.findUnique.mockResolvedValue(null);
      const result = await repo.getNumber("missing", 42);
      expect(result).toBe(42);
    });

    it("returns fallback when value is NaN", async () => {
      prisma.systemConfig.findUnique.mockResolvedValue({ ...configRow, value: "not_a_number" });
      const result = await repo.getNumber("activation_fee", 99);
      expect(result).toBe(99);
    });
  });

  describe("getAll", () => {
    it("returns all configs ordered by key", async () => {
      prisma.systemConfig.findMany.mockResolvedValue([configRow]);
      const result = await repo.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("activation_fee");
      expect(prisma.systemConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { key: "asc" } })
      );
    });

    it("returns empty array when no configs", async () => {
      prisma.systemConfig.findMany.mockResolvedValue([]);
      expect(await repo.getAll()).toHaveLength(0);
    });
  });

  describe("set", () => {
    it("upserts config value", async () => {
      prisma.systemConfig.upsert.mockResolvedValue(configRow);
      await repo.set("activation_fee", "20000", "admin");
      expect(prisma.systemConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "activation_fee" },
          update: { value: "20000", updatedBy: "admin" },
          create: expect.objectContaining({ key: "activation_fee", value: "20000" }),
        })
      );
    });

    it("sets updatedBy to null when not provided", async () => {
      prisma.systemConfig.upsert.mockResolvedValue(configRow);
      await repo.set("key", "value");
      const call = prisma.systemConfig.upsert.mock.calls[0][0];
      expect(call.update.updatedBy).toBeNull();
    });
  });

  describe("setMultiple", () => {
    it("upserts multiple configs in parallel", async () => {
      prisma.systemConfig.upsert.mockResolvedValue(configRow);
      await repo.setMultiple(
        [
          { key: "key1", value: "val1" },
          { key: "key2", value: "val2" },
        ],
        "admin"
      );
      expect(prisma.systemConfig.upsert).toHaveBeenCalledTimes(2);
    });

    it("handles empty array", async () => {
      await repo.setMultiple([]);
      expect(prisma.systemConfig.upsert).not.toHaveBeenCalled();
    });
  });
});
