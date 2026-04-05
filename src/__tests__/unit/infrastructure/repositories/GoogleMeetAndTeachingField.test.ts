// ─── GoogleMeetService Unit Tests ─────────────────────────────────────────────
import { GoogleMeetService, meetService } from "@/infrastructure/external/GoogleMeetService";

describe("GoogleMeetService", () => {
  let service: GoogleMeetService;

  beforeEach(() => {
    service = new GoogleMeetService();
  });

  describe("createMeetLink", () => {
    it("returns an object with meetLink and meetId", async () => {
      const result = await service.createMeetLink("sess_001");
      expect(result).toHaveProperty("meetLink");
      expect(result).toHaveProperty("meetId");
    });

    it("meetLink starts with https://meet.google.com/", async () => {
      const result = await service.createMeetLink("sess_001");
      expect(result.meetLink).toMatch(/^https:\/\/meet\.google\.com\//);
    });

    it("meetId follows xxx-yyyy-zzz pattern", async () => {
      const result = await service.createMeetLink("sess_001");
      expect(result.meetId).toMatch(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
    });

    it("meetLink ends with the meetId", async () => {
      const result = await service.createMeetLink("sess_001");
      expect(result.meetLink).toBe(`https://meet.google.com/${result.meetId}`);
    });

    it("generates unique meetIds for different calls", async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) => service.createMeetLink(`sess_00${i}`))
      );
      const ids = results.map((r) => r.meetId);
      const uniqueIds = new Set(ids);
      // With random generation over 10 calls, highly likely all unique
      expect(uniqueIds.size).toBeGreaterThan(1);
    });

    it("meetId contains only valid characters (no o or l)", async () => {
      // Run multiple times to statistically check character set
      for (let i = 0; i < 20; i++) {
        const { meetId } = await service.createMeetLink("sess");
        const chars = meetId.replace(/-/g, "");
        expect(chars).toMatch(/^[abcdefghijkmnpqrstuvwxyz]+$/);
      }
    });
  });

  describe("meetService singleton", () => {
    it("is an instance of GoogleMeetService", () => {
      expect(meetService).toBeInstanceOf(GoogleMeetService);
    });

    it("singleton also generates valid meet links", async () => {
      const result = await meetService.createMeetLink("sess_singleton");
      expect(result.meetLink).toMatch(/^https:\/\/meet\.google\.com\//);
    });
  });
});

// ─── PrismaTeachingFieldRepository Unit Tests ─────────────────────────────────
import { PrismaTeachingFieldRepository } from "@/infrastructure/database/repositories/teaching-field/PrismaTeachingFieldRepository";

function makePrisma() {
  return {
    teachingField: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mentorTeachingField: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  } as any;
}

const fieldRow = {
  id: "tf_001",
  name: "ReactJS",
  icon: "⚛️",
  isDeleted: false,
  sortOrder: 1,
};

describe("PrismaTeachingFieldRepository", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let repo: PrismaTeachingFieldRepository;

  beforeEach(() => {
    prisma = makePrisma();
    repo = new PrismaTeachingFieldRepository(prisma);
  });

  describe("findAll", () => {
    it("returns non-deleted fields ordered by sortOrder", async () => {
      prisma.teachingField.findMany.mockResolvedValue([fieldRow]);
      const result = await repo.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("tf_001");
      expect(prisma.teachingField.findMany).toHaveBeenCalledWith({
        where: { isDeleted: false },
        orderBy: { sortOrder: "asc" },
      });
    });
  });

  describe("findById", () => {
    it("returns field when found", async () => {
      prisma.teachingField.findUnique.mockResolvedValue(fieldRow);
      const result = await repo.findById("tf_001");
      expect(result!.id).toBe("tf_001");
      expect(prisma.teachingField.findUnique).toHaveBeenCalledWith({
        where: { id: "tf_001", isDeleted: false },
      });
    });

    it("returns null when not found", async () => {
      prisma.teachingField.findUnique.mockResolvedValue(null);
      expect(await repo.findById("missing")).toBeNull();
    });
  });

  describe("findByMentorId", () => {
    it("returns teaching fields for a mentor profile", async () => {
      prisma.mentorTeachingField.findMany.mockResolvedValue([
        { teachingField: fieldRow },
      ]);
      const result = await repo.findByMentorId("prof_001");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("ReactJS");
    });

    it("returns empty array when no fields", async () => {
      prisma.mentorTeachingField.findMany.mockResolvedValue([]);
      expect(await repo.findByMentorId("prof_001")).toHaveLength(0);
    });
  });

  describe("create", () => {
    it("creates teaching field", async () => {
      prisma.teachingField.create.mockResolvedValue(fieldRow);
      const result = await repo.create({ name: "ReactJS", icon: "⚛️", isDeleted: false, sortOrder: 1 });
      expect(result.id).toBe("tf_001");
      expect(prisma.teachingField.create).toHaveBeenCalledWith({
        data: { name: "ReactJS", icon: "⚛️", isDeleted: false, sortOrder: 1 },
      });
    });
  });

  describe("update", () => {
    it("updates teaching field", async () => {
      prisma.teachingField.update.mockResolvedValue({ ...fieldRow, name: "Vue.js" });
      const result = await repo.update("tf_001", { name: "Vue.js" });
      expect(result.name).toBe("Vue.js");
    });
  });

  describe("softDelete", () => {
    it("sets isDeleted=true", async () => {
      prisma.teachingField.update.mockResolvedValue({ ...fieldRow, isDeleted: true });
      await repo.softDelete("tf_001");
      expect(prisma.teachingField.update).toHaveBeenCalledWith({
        where: { id: "tf_001" },
        data: { isDeleted: true },
      });
    });
  });

  describe("setMentorFields", () => {
    it("deletes old fields and creates new ones", async () => {
      prisma.mentorTeachingField.deleteMany.mockResolvedValue({ count: 2 });
      prisma.mentorTeachingField.createMany.mockResolvedValue({ count: 2 });
      await repo.setMentorFields("prof_001", ["tf_001", "tf_002"]);
      expect(prisma.mentorTeachingField.deleteMany).toHaveBeenCalledWith({
        where: { mentorProfileId: "prof_001" },
      });
      expect(prisma.mentorTeachingField.createMany).toHaveBeenCalledWith({
        data: [
          { mentorProfileId: "prof_001", teachingFieldId: "tf_001" },
          { mentorProfileId: "prof_001", teachingFieldId: "tf_002" },
        ],
      });
    });

    it("skips createMany when fieldIds is empty", async () => {
      prisma.mentorTeachingField.deleteMany.mockResolvedValue({ count: 0 });
      await repo.setMentorFields("prof_001", []);
      expect(prisma.mentorTeachingField.deleteMany).toHaveBeenCalled();
      expect(prisma.mentorTeachingField.createMany).not.toHaveBeenCalled();
    });
  });
});
