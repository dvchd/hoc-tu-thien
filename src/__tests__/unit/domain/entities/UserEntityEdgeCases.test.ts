import { UserEntity } from "@/domain/entities/User";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { buildUser, buildAdmin, buildMentor } from "@/__tests__/helpers";

// ─── Additional edge cases for UserEntity ────────────────────────────────────

describe("UserEntity - edge cases", () => {

  describe("reconstitute()", () => {
    it("restores entity from persistence data", () => {
      const now = new Date();
      const entity = UserEntity.reconstitute(
        "restored_id",
        {
          email: { value: "restored@test.com" } as any,
          name: "Restored",
          image: null,
          role: UserRole.MENTOR,
          status: UserStatus.ACTIVE,
          bio: "bio text",
          phone: "0912345678",
        },
        {
          createdAt: now,
          updatedAt: now,
          createdBy: "seed",
          updatedBy: "seed",
          deletedAt: null,
          deletedBy: null,
          isDeleted: false,
          version: 7,
        }
      );

      expect(entity.id).toBe("restored_id");
      expect(entity.version).toBe(7);
      expect(entity.role).toBe(UserRole.MENTOR);
      expect(entity.name).toBe("Restored");
    });
  });

  describe("chained operations", () => {
    it("each operation returns a new entity with incremented version", () => {
      const user = buildUser(); // v1
      const promoted = user.promoteToMentor("admin"); // v2
      const updated = promoted.updateProfile({ bio: "new bio" }); // v3
      const suspended = updated.suspend("admin"); // v4

      expect(user.version).toBe(1);
      expect(promoted.version).toBe(2);
      expect(updated.version).toBe(3);
      expect(suspended.version).toBe(4);

      // All originals unchanged
      expect(user.role).toBe(UserRole.MENTEE);
      expect(promoted.status).toBe(UserStatus.ACTIVE);
    });

    it("softDelete on already-deleted entity still works", () => {
      const user = buildUser();
      const deleted1 = user.softDelete("admin");
      const deleted2 = deleted1.softDelete("admin2");

      expect(deleted2.isDeleted).toBe(true);
      expect(deleted2.version).toBe(deleted1.version + 1);
    });

    it("re-activating a soft-deleted user restores isActive()", () => {
      const user = buildUser();
      const deleted = user.softDelete("admin");
      // Hard restore (reconstitute with isDeleted=false)
      const restored = UserEntity.reconstitute(
        deleted.id,
        {
          email: deleted.email,
          name: deleted.name,
          image: deleted.image,
          role: deleted.role,
          status: deleted.status,
          bio: deleted.bio,
          phone: deleted.phone,
        },
        {
          createdAt: deleted.createdAt,
          updatedAt: new Date(),
          createdBy: deleted.createdBy,
          updatedBy: "system",
          deletedAt: null,
          deletedBy: null,
          isDeleted: false,
          version: deleted.version + 1,
        }
      );

      expect(restored.isActive()).toBe(true);
      expect(restored.isDeleted).toBe(false);
    });
  });

  describe("status transitions", () => {
    it("PENDING_ACTIVATION -> ACTIVE via activate()", () => {
      const user = buildUser({ status: UserStatus.PENDING_ACTIVATION });
      expect(user.status).toBe(UserStatus.PENDING_ACTIVATION);
      const activated = user.activate("system");
      expect(activated.status).toBe(UserStatus.ACTIVE);
    });

    it("ACTIVE -> SUSPENDED -> ACTIVE round-trip", () => {
      const user = buildUser({ status: UserStatus.ACTIVE });
      const suspended = user.suspend("admin");
      const reactivated = suspended.activate("admin");
      expect(reactivated.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe("role transitions", () => {
    it("MENTEE -> MENTOR -> MENTEE round-trip", () => {
      const mentee = buildUser({ role: UserRole.MENTEE });
      const mentor = mentee.promoteToMentor("admin");
      const backToMentee = mentor.demoteToMentee("admin");
      expect(backToMentee.role).toBe(UserRole.MENTEE);
    });

    it("promoting already-MENTOR user still returns MENTOR", () => {
      const mentor = buildMentor();
      const promoted = mentor.promoteToMentor("admin");
      expect(promoted.role).toBe(UserRole.MENTOR);
    });
  });

  describe("null/optional fields", () => {
    it("handles null name gracefully", () => {
      const user = buildUser({ name: null });
      expect(user.name).toBeNull();
      const dto_name = user.name ?? "(Chưa có tên)";
      expect(dto_name).toBe("(Chưa có tên)");
    });

    it("handles null bio and phone", () => {
      const user = buildUser({ bio: null, phone: null });
      expect(user.bio).toBeNull();
      expect(user.phone).toBeNull();
    });

    it("updateProfile with undefined fields preserves existing values", () => {
      const user = buildUser({ name: "Keep", bio: "Keep bio", phone: "0912345678" });
      const updated = user.updateProfile({}); // no changes
      expect(updated.name).toBe("Keep");
      expect(updated.bio).toBe("Keep bio");
      expect(updated.phone).toBe("0912345678");
    });
  });
});
