// ─── PrismaMentorApplicationRepository Unit Tests ────────────────────────────
import { PrismaMentorApplicationRepository } from "@/infrastructure/database/repositories/PrismaMentorApplicationRepository";

function makePrisma() {
  return {
    mentorApplication: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as any;
}

const userSnippet = { id: "u1", name: "Test User", email: "test@example.com", image: null };

const appRow = {
  id: "app_001",
  userId: "u1",
  motivation: "I want to help",
  experience: "3 years",
  linkedinUrl: "https://linkedin.com/in/test",
  contactInfo: "0912345678",
  status: "PENDING",
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  user: userSnippet,
};

describe("PrismaMentorApplicationRepository", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: PrismaMentorApplicationRepository;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaMentorApplicationRepository(prisma);
  });

  describe("findById", () => {
    it("returns application record when found", async () => {
      prisma.mentorApplication.findUnique.mockResolvedValue(appRow);
      const result = await repo.findById("app_001");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("app_001");
      expect(result!.user?.name).toBe("Test User");
    });

    it("returns null when not found", async () => {
      prisma.mentorApplication.findUnique.mockResolvedValue(null);
      expect(await repo.findById("missing")).toBeNull();
    });
  });

  describe("findByUserId", () => {
    it("returns application for user", async () => {
      prisma.mentorApplication.findUnique.mockResolvedValue(appRow);
      const result = await repo.findByUserId("u1");
      expect(result!.userId).toBe("u1");
    });

    it("returns null when not found", async () => {
      prisma.mentorApplication.findUnique.mockResolvedValue(null);
      expect(await repo.findByUserId("none")).toBeNull();
    });
  });

  describe("findAll", () => {
    it("returns paginated results with total", async () => {
      prisma.mentorApplication.findMany.mockResolvedValue([appRow]);
      prisma.mentorApplication.count.mockResolvedValue(1);
      const result = await repo.findAll();
      expect(result.applications).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("filters by status", async () => {
      prisma.mentorApplication.findMany.mockResolvedValue([]);
      prisma.mentorApplication.count.mockResolvedValue(0);
      await repo.findAll({ status: "APPROVED" });
      const findManyCall = prisma.mentorApplication.findMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe("APPROVED");
    });

    it("applies pagination skip/take", async () => {
      prisma.mentorApplication.findMany.mockResolvedValue([]);
      prisma.mentorApplication.count.mockResolvedValue(0);
      await repo.findAll({ page: 2, pageSize: 10 });
      const findManyCall = prisma.mentorApplication.findMany.mock.calls[0][0];
      expect(findManyCall.skip).toBe(10);
      expect(findManyCall.take).toBe(10);
    });

    it("uses defaults page=1 pageSize=20", async () => {
      prisma.mentorApplication.findMany.mockResolvedValue([]);
      prisma.mentorApplication.count.mockResolvedValue(0);
      await repo.findAll({});
      const call = prisma.mentorApplication.findMany.mock.calls[0][0];
      expect(call.skip).toBe(0);
      expect(call.take).toBe(20);
    });
  });

  describe("create", () => {
    it("creates application with PENDING status", async () => {
      prisma.mentorApplication.create.mockResolvedValue(appRow);
      const result = await repo.create({
        userId: "u1",
        motivation: "I want to help",
        experience: "3 years",
        linkedinUrl: "https://linkedin.com/in/test",
      });
      expect(result.status).toBe("PENDING");
      const data = prisma.mentorApplication.create.mock.calls[0][0].data;
      expect(data.status).toBe("PENDING");
      expect(data.version).toBe(1);
    });

    it("uses provided id if given", async () => {
      prisma.mentorApplication.create.mockResolvedValue({ ...appRow, id: "custom_id" });
      await repo.create({ id: "custom_id", userId: "u1", motivation: "x", experience: "y" });
      const data = prisma.mentorApplication.create.mock.calls[0][0].data;
      expect(data.id).toBe("custom_id");
    });

    it("handles null optional fields", async () => {
      prisma.mentorApplication.create.mockResolvedValue(appRow);
      await repo.create({ userId: "u1", motivation: "x", experience: "y" });
      const data = prisma.mentorApplication.create.mock.calls[0][0].data;
      expect(data.linkedinUrl).toBeNull();
      expect(data.contactInfo).toBeNull();
    });
  });

  describe("updateStatus", () => {
    it("updates status with reviewNote", async () => {
      const updated = { ...appRow, status: "APPROVED", reviewedBy: "admin", reviewNote: "Great" };
      prisma.mentorApplication.update.mockResolvedValue(updated);
      const result = await repo.updateStatus("app_001", "APPROVED", "admin", "Great");
      expect(result.status).toBe("APPROVED");
      const data = prisma.mentorApplication.update.mock.calls[0][0].data;
      expect(data.status).toBe("APPROVED");
      expect(data.reviewedBy).toBe("admin");
      expect(data.reviewedAt).toBeInstanceOf(Date);
      expect(data.version).toEqual({ increment: 1 });
    });

    it("sets reviewNote to null when not provided", async () => {
      prisma.mentorApplication.update.mockResolvedValue({ ...appRow, status: "REJECTED" });
      await repo.updateStatus("app_001", "REJECTED", "admin");
      const data = prisma.mentorApplication.update.mock.calls[0][0].data;
      expect(data.reviewNote).toBeNull();
    });
  });
});
