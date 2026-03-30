// ─── PrismaMentorProfileRepository Unit Tests ────────────────────────────────
import { PrismaMentorProfileRepository } from "@/infrastructure/database/repositories/PrismaMentorProfileRepository";

function makePrisma() {
  return {
    mentorProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as any;
}

const profileRow = {
  id: "prof_001",
  userId: "mentor_001",
  bio: "Experienced dev",
  experience: "5 years",
  headline: "Senior Dev",
  hourlyRate: 0,
  charityAccountId: "acc_001",
  onlyActivatedMentee: false,
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { name: "Mentor A", email: "mentor@example.com", image: null },
  charityAccount: {
    id: "acc_001",
    name: "Quỹ TN",
    accountNo: "2000",
    bankName: "MB Bank",
  },
  teachingFields: [
    {
      id: "mtf_001",
      teachingField: { id: "tf_001", name: "ReactJS", icon: null },
    },
  ],
  availabilitySlots: [
    { id: "slot_001", dayOfWeek: 1, startTime: "09:00", endTime: "11:00", isRecurring: true },
  ],
  totalSessions: 10,
  rating: 4.5,
  ratingCount: 8,
};

describe("PrismaMentorProfileRepository", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: PrismaMentorProfileRepository;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaMentorProfileRepository(prisma);
  });

  describe("findById", () => {
    it("returns mentor profile record when found", async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue(profileRow);
      const result = await repo.findById("prof_001");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("prof_001");
      expect(result!.averageRating).toBe(4.5);
      expect(result!.ratingCount).toBe(8);
      expect(result!.teachingFields).toHaveLength(1);
      expect(result!.availabilitySlots).toHaveLength(1);
    });

    it("returns null when not found", async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue(null);
      expect(await repo.findById("missing")).toBeNull();
    });
  });

  describe("findByUserId", () => {
    it("returns profile for userId", async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue(profileRow);
      const result = await repo.findByUserId("mentor_001");
      expect(result!.userId).toBe("mentor_001");
    });

    it("returns null when not found", async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue(null);
      expect(await repo.findByUserId("none")).toBeNull();
    });
  });

  describe("findAll", () => {
    it("returns all profiles without filter", async () => {
      prisma.mentorProfile.findMany.mockResolvedValue([profileRow]);
      const result = await repo.findAll();
      expect(result).toHaveLength(1);
      const call = prisma.mentorProfile.findMany.mock.calls[0][0];
      expect(call.where).toEqual({});
    });

    it("filters by isActive via isAvailable", async () => {
      prisma.mentorProfile.findMany.mockResolvedValue([]);
      await repo.findAll({ isActive: true });
      const call = prisma.mentorProfile.findMany.mock.calls[0][0];
      expect(call.where.isAvailable).toBe(true);
    });

    it("filters by isActive=false", async () => {
      prisma.mentorProfile.findMany.mockResolvedValue([]);
      await repo.findAll({ isActive: false });
      const call = prisma.mentorProfile.findMany.mock.calls[0][0];
      expect(call.where.isAvailable).toBe(false);
    });
  });

  describe("create", () => {
    it("maps isActive to isAvailable", async () => {
      prisma.mentorProfile.create.mockResolvedValue(profileRow);
      await repo.create({ id: "prof_001", userId: "mentor_001", isActive: true } as any);
      const data = prisma.mentorProfile.create.mock.calls[0][0].data;
      expect(data.isAvailable).toBe(true);
      expect(data.isActive).toBeUndefined();
    });

    it("creates without isActive mapping when undefined", async () => {
      prisma.mentorProfile.create.mockResolvedValue(profileRow);
      await repo.create({ id: "prof_001", userId: "mentor_001" } as any);
      const data = prisma.mentorProfile.create.mock.calls[0][0].data;
      expect(data.isAvailable).toBeUndefined();
    });
  });

  describe("update", () => {
    it("maps isActive to isAvailable on update", async () => {
      prisma.mentorProfile.update.mockResolvedValue(profileRow);
      await repo.update("prof_001", { isActive: false } as any);
      const data = prisma.mentorProfile.update.mock.calls[0][0].data;
      expect(data.isAvailable).toBe(false);
      expect(data.isActive).toBeUndefined();
    });

    it("strips relation fields from update data", async () => {
      prisma.mentorProfile.update.mockResolvedValue(profileRow);
      await repo.update("prof_001", {
        bio: "Updated bio",
        user: { name: "x" },
        charityAccount: null,
        teachingFields: [],
        availabilitySlots: [],
      } as any);
      const data = prisma.mentorProfile.update.mock.calls[0][0].data;
      expect(data.expertise).toBe("Updated bio"); // bio maps to expertise in schema
      expect(data.user).toBeUndefined();
      expect(data.charityAccount).toBeUndefined();
    });
  });

  describe("incrementTotalSessions", () => {
    it("increments totalSessions by 1", async () => {
      prisma.mentorProfile.updateMany.mockResolvedValue({ count: 1 });
      await repo.incrementTotalSessions("mentor_001");
      expect(prisma.mentorProfile.updateMany).toHaveBeenCalledWith({
        where: { userId: "mentor_001" },
        data: { totalSessions: { increment: 1 } },
      });
    });
  });

  describe("updateRatingStats", () => {
    it("computes weighted average and updates", async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue({
        id: "prof_001",
        rating: 4.0,
        ratingCount: 4,
      });
      prisma.mentorProfile.update.mockResolvedValue(profileRow);
      await repo.updateRatingStats("mentor_001", 5);
      const data = prisma.mentorProfile.update.mock.calls[0][0].data;
      // (4.0 * 4 + 5) / 5 = 4.2
      expect(data.ratingCount).toBe(5);
      expect(data.rating).toBeCloseTo(4.2);
    });

    it("handles first rating (ratingCount=0, rating=0)", async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue({
        id: "prof_001",
        rating: null,
        ratingCount: 0,
      });
      prisma.mentorProfile.update.mockResolvedValue(profileRow);
      await repo.updateRatingStats("mentor_001", 5);
      const data = prisma.mentorProfile.update.mock.calls[0][0].data;
      expect(data.rating).toBe(5);
      expect(data.ratingCount).toBe(1);
    });

    it("returns early when profile not found", async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue(null);
      await repo.updateRatingStats("mentor_001", 5);
      expect(prisma.mentorProfile.update).not.toHaveBeenCalled();
    });
  });
});
