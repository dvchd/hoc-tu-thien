// ─── PrismaSessionRepository Unit Tests ──────────────────────────────────────
import { PrismaSessionRepository } from "@/infrastructure/database/repositories/session/PrismaSessionRepository";
import { SessionStatus } from "@/domain/value-objects/Payment";

function makePrisma() {
  return {
    learningSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    mentorProfile: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;
}

const sessionRow = {
  id: "sess_001",
  menteeId: "mentee_001",
  mentorId: "mentor_001",
  teachingFieldId: null,
  title: "Học ReactJS",
  description: null,
  status: "PENDING",
  scheduledAt: new Date(Date.now() + 86400000),
  durationMinutes: 60,
  endAt: new Date(Date.now() + 86400000 + 3600000),
  meetLink: null,
  meetId: null,
  fee: 0,
  notes: null,
  mentorNotes: null,
  rating: null,
  ratingComment: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};

describe("PrismaSessionRepository", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: PrismaSessionRepository;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaSessionRepository(prisma);
  });

  describe("findById", () => {
    it("returns session record when found", async () => {
      prisma.learningSession.findUnique.mockResolvedValue(sessionRow);
      const result = await repo.findById("sess_001");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("sess_001");
      expect(result!.status).toBe(SessionStatus.PENDING);
    });

    it("returns null when not found", async () => {
      prisma.learningSession.findUnique.mockResolvedValue(null);
      expect(await repo.findById("missing")).toBeNull();
    });
  });

  describe("findByMenteeId", () => {
    it("returns sessions with default limit 50", async () => {
      prisma.learningSession.findMany.mockResolvedValue([sessionRow]);
      const result = await repo.findByMenteeId("mentee_001");
      expect(result).toHaveLength(1);
      expect(prisma.learningSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { menteeId: "mentee_001" }, take: 50 })
      );
    });

    it("respects custom limit", async () => {
      prisma.learningSession.findMany.mockResolvedValue([]);
      await repo.findByMenteeId("mentee_001", 10);
      expect(prisma.learningSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });

  describe("findByMentorId", () => {
    it("returns sessions ordered by scheduledAt desc", async () => {
      prisma.learningSession.findMany.mockResolvedValue([sessionRow]);
      const result = await repo.findByMentorId("mentor_001");
      expect(result).toHaveLength(1);
      expect(prisma.learningSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { scheduledAt: "desc" } })
      );
    });
  });

  describe("findUpcomingByMentorId", () => {
    it("returns upcoming pending/confirmed sessions", async () => {
      prisma.learningSession.findMany.mockResolvedValue([sessionRow]);
      const result = await repo.findUpcomingByMentorId("mentor_001");
      expect(result).toHaveLength(1);
      const call = prisma.learningSession.findMany.mock.calls[0][0];
      expect(call.where.status.in).toContain("PENDING");
      expect(call.where.status.in).toContain("CONFIRMED");
    });
  });

  describe("findPendingPaymentByMenteeId", () => {
    it("returns session with PAYMENT_PENDING status", async () => {
      prisma.learningSession.findFirst.mockResolvedValue({ ...sessionRow, status: "PAYMENT_PENDING" });
      const result = await repo.findPendingPaymentByMenteeId("mentee_001");
      expect(result!.status).toBe(SessionStatus.PAYMENT_PENDING);
    });

    it("returns null when no pending payment session", async () => {
      prisma.learningSession.findFirst.mockResolvedValue(null);
      expect(await repo.findPendingPaymentByMenteeId("mentee_001")).toBeNull();
    });
  });

  describe("findActiveByMenteeId", () => {
    it("returns active sessions (PENDING/CONFIRMED/IN_PROGRESS/PAYMENT_PENDING)", async () => {
      prisma.learningSession.findMany.mockResolvedValue([sessionRow]);
      const result = await repo.findActiveByMenteeId("mentee_001");
      expect(result).toHaveLength(1);
      const call = prisma.learningSession.findMany.mock.calls[0][0];
      expect(call.where.status.in).toContain("IN_PROGRESS");
    });
  });

  describe("countActiveByMenteeId", () => {
    it("returns count of active sessions", async () => {
      prisma.learningSession.count.mockResolvedValue(3);
      expect(await repo.countActiveByMenteeId("mentee_001")).toBe(3);
    });
  });

  describe("findConflictingSession", () => {
    it("returns conflicting session when found", async () => {
      prisma.learningSession.findFirst.mockResolvedValue(sessionRow);
      const scheduledAt = new Date();
      const result = await repo.findConflictingSession("mentor_001", scheduledAt, 60);
      expect(result).not.toBeNull();
    });

    it("returns null when no conflict", async () => {
      prisma.learningSession.findFirst.mockResolvedValue(null);
      expect(await repo.findConflictingSession("mentor_001", new Date(), 60)).toBeNull();
    });

    it("excludes given session id", async () => {
      prisma.learningSession.findFirst.mockResolvedValue(null);
      await repo.findConflictingSession("mentor_001", new Date(), 60, "sess_001");
      const call = prisma.learningSession.findFirst.mock.calls[0][0];
      expect(call.where.id).toEqual({ not: "sess_001" });
    });

    it("does not include id filter when no excludeSessionId", async () => {
      prisma.learningSession.findFirst.mockResolvedValue(null);
      await repo.findConflictingSession("mentor_001", new Date(), 60);
      const call = prisma.learningSession.findFirst.mock.calls[0][0];
      expect(call.where.id).toBeUndefined();
    });
  });

  describe("getMentorProfileFee", () => {
    it("returns profile fee data when found", async () => {
      const feeData = { hourlyRate: 0, tnAccountNo: "2000", tnAccountName: "QUY TN", tnCampaignKeyword: "KW", charityAccountId: "acc_001" };
      prisma.mentorProfile.findUnique.mockResolvedValue(feeData);
      const result = await repo.getMentorProfileFee("mentor_001");
      expect(result).toEqual(feeData);
    });

    it("returns null when not found", async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue(null);
      expect(await repo.getMentorProfileFee("mentor_001")).toBeNull();
    });
  });

  describe("create", () => {
    it("creates session with PENDING status and computed endAt", async () => {
      prisma.learningSession.create.mockResolvedValue(sessionRow);
      const scheduledAt = new Date("2026-04-01T10:00:00Z");
      const result = await repo.create({
        id: "sess_001",
        menteeId: "mentee_001",
        mentorId: "mentor_001",
        teachingFieldId: null,
        title: "Học ReactJS",
        scheduledAt,
        durationMinutes: 60,
        fee: 0,
      });
      expect(result.id).toBe("sess_001");
      const data = prisma.learningSession.create.mock.calls[0][0].data;
      expect(data.status).toBe("PENDING");
      expect(data.version).toBe(1);
      // endAt should be scheduledAt + 60 min
      const expectedEnd = new Date(scheduledAt.getTime() + 60 * 60000);
      expect(data.endAt).toEqual(expectedEnd);
    });
  });

  describe("updateStatus", () => {
    it("updates status with optional meet link", async () => {
      prisma.learningSession.update.mockResolvedValue({ ...sessionRow, status: "CONFIRMED", meetLink: "https://meet.google.com/abc" });
      const result = await repo.updateStatus("sess_001", SessionStatus.CONFIRMED, { meetLink: "https://meet.google.com/abc" });
      expect(result.status).toBe(SessionStatus.CONFIRMED);
    });

    it("updates with cancelReason and sets cancelledAt", async () => {
      prisma.learningSession.update.mockResolvedValue({ ...sessionRow, status: "CANCELLED" });
      await repo.updateStatus("sess_001", SessionStatus.CANCELLED, {
        cancelReason: "Unable to attend",
        cancelledBy: "mentee_001",
      });
      const data = prisma.learningSession.update.mock.calls[0][0].data;
      expect(data.cancelReason).toBe("Unable to attend");
      expect(data.cancelledAt).toBeInstanceOf(Date);
    });

    it("does not set cancelledAt when cancelledBy is absent", async () => {
      prisma.learningSession.update.mockResolvedValue({ ...sessionRow, status: "CANCELLED" });
      await repo.updateStatus("sess_001", SessionStatus.CANCELLED);
      const data = prisma.learningSession.update.mock.calls[0][0].data;
      expect(data.cancelledAt).toBeUndefined();
    });
  });

  describe("updateConfirmation", () => {
    it("sets mentorConfirmed=true with meetLink", async () => {
      prisma.learningSession.update.mockResolvedValue(sessionRow);
      await repo.updateConfirmation("sess_001", "mentor", { meetLink: "https://meet.google.com/xyz" });
      const data = prisma.learningSession.update.mock.calls[0][0].data;
      expect(data.mentorConfirmed).toBe(true);
      expect(data.meetLink).toBe("https://meet.google.com/xyz");
    });

    it("sets menteeConfirmed=true", async () => {
      prisma.learningSession.update.mockResolvedValue(sessionRow);
      await repo.updateConfirmation("sess_001", "mentee");
      const data = prisma.learningSession.update.mock.calls[0][0].data;
      expect(data.menteeConfirmed).toBe(true);
      expect(data.mentorConfirmed).toBeUndefined();
    });
  });

  describe("addRating", () => {
    it("adds rating and comment", async () => {
      prisma.learningSession.update.mockResolvedValue({ ...sessionRow, rating: 5 });
      const result = await repo.addRating("sess_001", 5, "Excellent!");
      expect(result.rating).toBe(5);
      const data = prisma.learningSession.update.mock.calls[0][0].data;
      expect(data.rating).toBe(5);
      expect(data.ratingComment).toBe("Excellent!");
    });
  });

  describe("getTopMentors", () => {
    it("returns leaderboard entries with user info", async () => {
      prisma.learningSession.groupBy.mockResolvedValue([
        { mentorId: "mentor_001", _count: { id: 5 }, _sum: { fee: 50000 } },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: "mentor_001", name: "Mentor A", image: null },
      ]);
      const result = await repo.getTopMentors(3, 2026);
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("mentor_001");
      expect(result[0].sessionCount).toBe(5);
      expect(result[0].totalAmount).toBe(50000);
    });

    it("uses Unknown for missing user", async () => {
      prisma.learningSession.groupBy.mockResolvedValue([
        { mentorId: "mentor_999", _count: { id: 1 }, _sum: { fee: null } },
      ]);
      prisma.user.findMany.mockResolvedValue([]);
      const result = await repo.getTopMentors(3, 2026);
      expect(result[0].name).toBe("Unknown");
      expect(result[0].totalAmount).toBe(0);
    });
  });

  describe("getTopMentees", () => {
    it("returns leaderboard entries for mentees", async () => {
      prisma.learningSession.groupBy.mockResolvedValue([
        { menteeId: "mentee_001", _count: { id: 3 }, _sum: { fee: 30000 } },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: "mentee_001", name: "Mentee A", image: null },
      ]);
      const result = await repo.getTopMentees(3, 2026);
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("mentee_001");
    });
  });

  describe("getMenteeStats", () => {
    it("returns mentee stats aggregated correctly", async () => {
      prisma.learningSession.findMany.mockResolvedValue([
        { fee: 20000, durationMinutes: 60 },
        { fee: 30000, durationMinutes: 90 },
      ]);
      prisma.user.findUnique.mockResolvedValue({
        lateCancellationCount: 1,
        menteeProfile: { noShowCount: 2 },
      });
      const result = await repo.getMenteeStats("mentee_001");
      expect(result.totalSessions).toBe(2);
      expect(result.totalDonated).toBe(50000);
      expect(result.totalHours).toBeCloseTo(2.5);
      expect(result.noShowCount).toBe(2);
      expect(result.lateCancellationCount).toBe(1);
    });

    it("handles missing user / menteeProfile gracefully", async () => {
      prisma.learningSession.findMany.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await repo.getMenteeStats("mentee_001");
      expect(result.totalSessions).toBe(0);
      expect(result.noShowCount).toBe(0);
      expect(result.lateCancellationCount).toBe(0);
    });
  });

  describe("getMentorStats", () => {
    it("returns mentor stats aggregated correctly", async () => {
      prisma.learningSession.findMany.mockResolvedValue([
        { fee: 10000, durationMinutes: 60, menteeId: "m1" },
        { fee: 10000, durationMinutes: 60, menteeId: "m2" },
        { fee: 10000, durationMinutes: 60, menteeId: "m1" }, // duplicate mentee
      ]);
      prisma.mentorProfile.findUnique.mockResolvedValue({ rating: 4.5, ratingCount: 10 });
      prisma.user.findUnique.mockResolvedValue({ lateCancellationCount: 0 });
      const result = await repo.getMentorStats("mentor_001");
      expect(result.totalSessions).toBe(3);
      expect(result.totalMentees).toBe(2); // unique
      expect(result.totalDonations).toBe(30000);
      expect(result.avgRating).toBe(4.5);
    });

    it("handles missing profile and user gracefully", async () => {
      prisma.learningSession.findMany.mockResolvedValue([]);
      prisma.mentorProfile.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await repo.getMentorStats("mentor_001");
      expect(result.avgRating).toBeNull();
      expect(result.ratingCount).toBe(0);
      expect(result.lateCancellationCount).toBe(0);
    });
  });
});
