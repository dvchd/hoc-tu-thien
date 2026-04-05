import { AuditableEntity, AuditableEntityProps } from "@/domain/entities/base/AuditableEntity";

// Concrete subclass for testing
class TestEntity extends AuditableEntity {
  constructor(id: string, audit: AuditableEntityProps) {
    super(id, audit);
  }

  static create(id: string, createdBy?: string): TestEntity {
    return new TestEntity(id, AuditableEntity.defaultAudit(createdBy));
  }
}

describe("AuditableEntity", () => {
  describe("defaultAudit()", () => {
    it("should set default audit fields on creation", () => {
      const before = new Date();
      const audit = AuditableEntity.defaultAudit("system");
      const after = new Date();

      expect(audit.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(audit.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(audit.updatedAt).toEqual(audit.createdAt);
      expect(audit.createdBy).toBe("system");
      expect(audit.updatedBy).toBe("system");
    });

    it("should default to version 1", () => {
      const audit = AuditableEntity.defaultAudit();
      expect(audit.version).toBe(1);
    });

    it("should default isDeleted to false", () => {
      const audit = AuditableEntity.defaultAudit();
      expect(audit.isDeleted).toBe(false);
      expect(audit.deletedAt).toBeNull();
      expect(audit.deletedBy).toBeNull();
    });

    it("should handle undefined createdBy", () => {
      const audit = AuditableEntity.defaultAudit();
      expect(audit.createdBy).toBeNull();
      expect(audit.updatedBy).toBeNull();
    });
  });

  describe("isActive()", () => {
    it("returns true when not deleted", () => {
      const entity = TestEntity.create("1");
      expect(entity.isActive()).toBe(true);
    });

    it("returns false when isDeleted is true", () => {
      const entity = new TestEntity("1", {
        ...AuditableEntity.defaultAudit(),
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: "admin",
      });
      expect(entity.isActive()).toBe(false);
    });
  });

  describe("equals()", () => {
    it("returns true for same id", () => {
      const a = TestEntity.create("same-id");
      const b = TestEntity.create("same-id");
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different ids", () => {
      const a = TestEntity.create("id-1");
      const b = TestEntity.create("id-2");
      expect(a.equals(b)).toBe(false);
    });

    it("returns false when comparing with non-entity", () => {
      const a = TestEntity.create("id-1");
      expect(a.equals({} as any)).toBe(false);
    });
  });

  describe("version tracking", () => {
    it("starts at version 1", () => {
      const entity = TestEntity.create("v1");
      expect(entity.version).toBe(1);
    });
  });
});
