import { UserEntity } from "@/domain/entities/User";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { buildUser, buildAdmin, buildMentor } from "@/__tests__/helpers";

describe("UserEntity", () => {
  // ─── Factory Methods ──────────────────────────────────────────────────────

  describe("create()", () => {
    it("creates a user with default MENTEE role", () => {
      const user = UserEntity.create({ id: "u1", email: "test@example.com" });
      expect(user.role).toBe(UserRole.MENTEE);
    });

    it("creates a user with default PENDING_ACTIVATION status", () => {
      const user = UserEntity.create({ id: "u1", email: "test@example.com" });
      expect(user.status).toBe(UserStatus.PENDING_ACTIVATION);
    });

    it("normalises email to lowercase", () => {
      const user = UserEntity.create({ id: "u1", email: "Test@EXAMPLE.COM" });
      expect(user.email.value).toBe("test@example.com");
    });

    it("throws on invalid email", () => {
      expect(() => UserEntity.create({ id: "u1", email: "not-an-email" })).toThrow();
    });

    it("initialises version at 1", () => {
      const user = buildUser();
      expect(user.version).toBe(1);
    });

    it("sets createdBy from parameter", () => {
      const user = UserEntity.create({ id: "u1", email: "a@b.com", createdBy: "oauth" });
      expect(user.createdBy).toBe("oauth");
    });
  });

  // ─── Role checks ─────────────────────────────────────────────────────────

  describe("role predicates", () => {
    it("isAdmin() is true for ADMIN role", () => {
      expect(buildAdmin().isAdmin()).toBe(true);
    });

    it("isMentor() is true for MENTOR role", () => {
      expect(buildMentor().isMentor()).toBe(true);
    });

    it("isMentee() is true for MENTEE role", () => {
      expect(buildUser().isMentee()).toBe(true);
    });

    it("isAdmin() is false for non-admin", () => {
      expect(buildMentor().isAdmin()).toBe(false);
      expect(buildUser().isAdmin()).toBe(false);
    });
  });

  // ─── promoteToMentor ──────────────────────────────────────────────────────

  describe("promoteToMentor()", () => {
    it("promotes MENTEE to MENTOR", () => {
      const mentee = buildUser({ role: UserRole.MENTEE });
      const promoted = mentee.promoteToMentor("admin_001");
      expect(promoted.role).toBe(UserRole.MENTOR);
    });

    it("increments version after promotion", () => {
      const mentee = buildUser();
      const promoted = mentee.promoteToMentor("admin");
      expect(promoted.version).toBe(mentee.version + 1);
    });

    it("sets updatedBy to performer", () => {
      const mentee = buildUser();
      const promoted = mentee.promoteToMentor("admin_001");
      expect(promoted.updatedBy).toBe("admin_001");
    });

    it("throws when promoting an ADMIN", () => {
      const admin = buildAdmin();
      expect(() => admin.promoteToMentor("someone")).toThrow("Admin cannot be promoted to Mentor");
    });

    it("does not mutate original entity (immutability)", () => {
      const mentee = buildUser({ role: UserRole.MENTEE });
      mentee.promoteToMentor("admin");
      expect(mentee.role).toBe(UserRole.MENTEE); // original unchanged
    });
  });

  // ─── demoteToMentee ───────────────────────────────────────────────────────

  describe("demoteToMentee()", () => {
    it("demotes MENTOR to MENTEE", () => {
      const mentor = buildMentor();
      const demoted = mentor.demoteToMentee("admin");
      expect(demoted.role).toBe(UserRole.MENTEE);
    });

    it("throws when demoting an ADMIN", () => {
      expect(() => buildAdmin().demoteToMentee("someone")).toThrow(
        "Admin cannot be demoted to Mentee"
      );
    });

    it("increments version", () => {
      const mentor = buildMentor();
      const demoted = mentor.demoteToMentee("admin");
      expect(demoted.version).toBe(mentor.version + 1);
    });
  });

  // ─── updateProfile ────────────────────────────────────────────────────────

  describe("updateProfile()", () => {
    it("updates name only", () => {
      const user = buildUser({ name: "Old Name" });
      const updated = user.updateProfile({ name: "New Name" }, "user");
      expect(updated.name).toBe("New Name");
      expect(updated.bio).toBe(user.bio);
    });

    it("updates bio and phone", () => {
      const user = buildUser();
      const updated = user.updateProfile({ bio: "New bio", phone: "0901234567" });
      expect(updated.bio).toBe("New bio");
      expect(updated.phone).toBe("0901234567");
    });

    it("keeps unchanged fields intact", () => {
      const user = buildUser({ name: "Keep Me" });
      const updated = user.updateProfile({ bio: "Changed" });
      expect(updated.name).toBe("Keep Me");
    });

    it("increments version", () => {
      const user = buildUser();
      const updated = user.updateProfile({ name: "X" });
      expect(updated.version).toBe(user.version + 1);
    });
  });

  // ─── suspend / activate ───────────────────────────────────────────────────

  describe("suspend()", () => {
    it("sets status to SUSPENDED", () => {
      const user = buildUser({ status: UserStatus.ACTIVE });
      const suspended = user.suspend("admin");
      expect(suspended.status).toBe(UserStatus.SUSPENDED);
    });

    it("increments version", () => {
      const user = buildUser();
      expect(user.suspend().version).toBe(user.version + 1);
    });
  });

  describe("activate()", () => {
    it("sets status to ACTIVE", () => {
      const user = buildUser({ status: UserStatus.SUSPENDED });
      const activated = user.activate("admin");
      expect(activated.status).toBe(UserStatus.ACTIVE);
    });
  });

  // ─── softDelete ───────────────────────────────────────────────────────────

  describe("softDelete()", () => {
    it("sets isDeleted to true", () => {
      const user = buildUser();
      const deleted = user.softDelete("admin");
      expect(deleted.isDeleted).toBe(true);
    });

    it("sets deletedAt timestamp", () => {
      const before = new Date();
      const deleted = buildUser().softDelete("admin");
      expect(deleted.deletedAt).not.toBeNull();
      expect(deleted.deletedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("sets deletedBy", () => {
      const deleted = buildUser().softDelete("admin_007");
      expect(deleted.deletedBy).toBe("admin_007");
    });

    it("isActive() returns false after soft delete", () => {
      const deleted = buildUser().softDelete("admin");
      expect(deleted.isActive()).toBe(false);
    });

    it("original entity is not mutated", () => {
      const user = buildUser();
      user.softDelete("admin");
      expect(user.isDeleted).toBe(false);
    });

    it("increments version", () => {
      const user = buildUser();
      expect(user.softDelete("admin").version).toBe(user.version + 1);
    });
  });

  // ─── canBeMentor ─────────────────────────────────────────────────────────

  describe("canBeMentor()", () => {
    it("returns true for active user", () => {
      const user = buildUser({ status: UserStatus.ACTIVE });
      expect(user.canBeMentor()).toBe(true);
    });

    it("returns false for suspended user", () => {
      const user = buildUser({ status: UserStatus.SUSPENDED });
      expect(user.canBeMentor()).toBe(false);
    });

    it("returns false for soft-deleted user", () => {
      const deleted = buildUser().softDelete("admin");
      expect(deleted.canBeMentor()).toBe(false);
    });
  });
});
