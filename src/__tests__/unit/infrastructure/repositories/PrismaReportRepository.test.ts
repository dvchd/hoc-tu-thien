// ─── PrismaReportRepository Unit Tests ───────────────────────────────────────
import { PrismaReportRepository } from "@/infrastructure/database/repositories/PrismaReportRepository";

function makePrisma() {
  return {
    report: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as any;
}

const userSnippet = { id: "u1", name: "Test User", email: "test@example.com", image: null };

const reportRow = {
  id: "rep_001",
  reporterId: "u1",
  reportedUserId: "u2",
  sessionId: null,
  reason: "INAPPROPRIATE_BEHAVIOR",
  description: "Very bad",
  status: "PENDING",
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: null,
  createdAt: new Date(),
  reporter: userSnippet,
  reportedUser: { ...userSnippet, id: "u2", email: "u2@example.com" },
};

describe("PrismaReportRepository", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: PrismaReportRepository;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaReportRepository(prisma);
  });

  describe("findById", () => {
    it("returns report record with user info when found", async () => {
      prisma.report.findUnique.mockResolvedValue(reportRow);
      const result = await repo.findById("rep_001");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("rep_001");
      expect(result!.reporter?.name).toBe("Test User");
    });

    it("returns null when not found", async () => {
      prisma.report.findUnique.mockResolvedValue(null);
      expect(await repo.findById("missing")).toBeNull();
    });
  });

  describe("findAll", () => {
    it("returns paginated results with total", async () => {
      prisma.report.findMany.mockResolvedValue([reportRow]);
      prisma.report.count.mockResolvedValue(1);
      const result = await repo.findAll();
      expect(result.reports).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("filters by status", async () => {
      prisma.report.findMany.mockResolvedValue([]);
      prisma.report.count.mockResolvedValue(0);
      await repo.findAll({ status: "REVIEWED" });
      const call = prisma.report.findMany.mock.calls[0][0];
      expect(call.where.status).toBe("REVIEWED");
    });

    it("applies pagination", async () => {
      prisma.report.findMany.mockResolvedValue([]);
      prisma.report.count.mockResolvedValue(0);
      await repo.findAll({ page: 3, pageSize: 5 });
      const call = prisma.report.findMany.mock.calls[0][0];
      expect(call.skip).toBe(10);
      expect(call.take).toBe(5);
    });

    it("uses defaults page=1 pageSize=20", async () => {
      prisma.report.findMany.mockResolvedValue([]);
      prisma.report.count.mockResolvedValue(0);
      await repo.findAll({});
      const call = prisma.report.findMany.mock.calls[0][0];
      expect(call.skip).toBe(0);
      expect(call.take).toBe(20);
    });

    it("maps reporter and reportedUser to record", async () => {
      prisma.report.findMany.mockResolvedValue([reportRow]);
      prisma.report.count.mockResolvedValue(1);
      const result = await repo.findAll();
      expect(result.reports[0].reporter?.id).toBe("u1");
      expect(result.reports[0].reportedUser?.id).toBe("u2");
    });
  });

  describe("create", () => {
    it("creates report with PENDING status", async () => {
      prisma.report.create.mockResolvedValue(reportRow);
      const result = await repo.create({
        id: "rep_001",
        reporterId: "u1",
        reportedUserId: "u2",
        reason: "INAPPROPRIATE_BEHAVIOR",
        description: "Very bad",
      });
      expect(result.id).toBe("rep_001");
      const data = prisma.report.create.mock.calls[0][0].data;
      expect(data.status).toBe("PENDING");
    });

    it("sets sessionId to null when not provided", async () => {
      prisma.report.create.mockResolvedValue(reportRow);
      await repo.create({
        id: "rep_001",
        reporterId: "u1",
        reportedUserId: "u2",
        reason: "SPAM",
        description: "Spam",
      });
      const data = prisma.report.create.mock.calls[0][0].data;
      expect(data.sessionId).toBeNull();
    });

    it("passes sessionId when provided", async () => {
      prisma.report.create.mockResolvedValue(reportRow);
      await repo.create({
        id: "rep_001",
        reporterId: "u1",
        reportedUserId: "u2",
        sessionId: "sess_001",
        reason: "SPAM",
        description: "Spam",
      });
      const data = prisma.report.create.mock.calls[0][0].data;
      expect(data.sessionId).toBe("sess_001");
    });
  });

  describe("updateStatus", () => {
    it("updates status with review info", async () => {
      const updated = { ...reportRow, status: "REVIEWED", reviewedBy: "admin" };
      prisma.report.update.mockResolvedValue(updated);
      const result = await repo.updateStatus("rep_001", "REVIEWED", "admin", "Confirmed");
      expect(result.status).toBe("REVIEWED");
      const data = prisma.report.update.mock.calls[0][0].data;
      expect(data.reviewedBy).toBe("admin");
      expect(data.reviewedAt).toBeInstanceOf(Date);
      expect(data.reviewNote).toBe("Confirmed");
    });

    it("sets reviewNote to null when not provided", async () => {
      prisma.report.update.mockResolvedValue({ ...reportRow, status: "DISMISSED" });
      await repo.updateStatus("rep_001", "DISMISSED", "admin");
      const data = prisma.report.update.mock.calls[0][0].data;
      expect(data.reviewNote).toBeNull();
    });
  });
});
