import { Email } from "@/domain/value-objects/Email";
import { UserRole, UserRoleLabels, UserRoleColors, isValidRole } from "@/domain/value-objects/UserRole";
import { UserStatus, UserStatusLabels, UserStatusColors } from "@/domain/value-objects/UserStatus";

// ─── Email ────────────────────────────────────────────────────────────────────

describe("Email value object", () => {
  describe("create()", () => {
    it("accepts a valid email", () => {
      const email = Email.create("user@example.com");
      expect(email.value).toBe("user@example.com");
    });

    it("normalises to lowercase", () => {
      const email = Email.create("USER@EXAMPLE.COM");
      expect(email.value).toBe("user@example.com");
    });

    it("trims whitespace", () => {
      const email = Email.create("  user@example.com  ");
      expect(email.value).toBe("user@example.com");
    });

    it("throws on missing @ symbol", () => {
      expect(() => Email.create("notanemail")).toThrow("Invalid email address");
    });

    it("throws on empty string", () => {
      expect(() => Email.create("")).toThrow();
    });

    it("throws on email without domain", () => {
      expect(() => Email.create("user@")).toThrow();
    });

    it("throws on email without TLD", () => {
      expect(() => Email.create("user@domain")).toThrow();
    });
  });

  describe("isValid()", () => {
    it("returns true for valid emails", () => {
      expect(Email.isValid("a@b.com")).toBe(true);
      expect(Email.isValid("test.user+tag@example.co.uk")).toBe(true);
    });

    it("returns false for invalid emails", () => {
      expect(Email.isValid("bad")).toBe(false);
      expect(Email.isValid("@domain.com")).toBe(false);
      expect(Email.isValid("user@")).toBe(false);
      expect(Email.isValid("")).toBe(false);
    });
  });

  describe("equals()", () => {
    it("returns true for same email value", () => {
      const a = Email.create("same@example.com");
      const b = Email.create("same@example.com");
      expect(a.equals(b)).toBe(true);
    });

    it("returns true when one has uppercase (after normalisation)", () => {
      const a = Email.create("SAME@EXAMPLE.COM");
      const b = Email.create("same@example.com");
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different emails", () => {
      const a = Email.create("a@example.com");
      const b = Email.create("b@example.com");
      expect(a.equals(b)).toBe(false);
    });
  });

  describe("toString()", () => {
    it("returns the email string", () => {
      const email = Email.create("hello@world.com");
      expect(email.toString()).toBe("hello@world.com");
      expect(`${email}`).toBe("hello@world.com");
    });
  });
});

// ─── UserRole ─────────────────────────────────────────────────────────────────

describe("UserRole value object", () => {
  it("has three roles: ADMIN, MENTOR, MENTEE", () => {
    expect(Object.values(UserRole)).toHaveLength(3);
    expect(Object.values(UserRole)).toContain("ADMIN");
    expect(Object.values(UserRole)).toContain("MENTOR");
    expect(Object.values(UserRole)).toContain("MENTEE");
  });

  it("has Vietnamese labels for all roles", () => {
    expect(UserRoleLabels[UserRole.ADMIN]).toBe("Quản trị viên");
    expect(UserRoleLabels[UserRole.MENTOR]).toBe("Người hướng dẫn");
    expect(UserRoleLabels[UserRole.MENTEE]).toBe("Người học");
  });

  it("has a colour class for every role", () => {
    Object.values(UserRole).forEach((role) => {
      expect(UserRoleColors[role]).toBeDefined();
      expect(typeof UserRoleColors[role]).toBe("string");
    });
  });

  describe("isValidRole()", () => {
    it("returns true for valid role strings", () => {
      expect(isValidRole("ADMIN")).toBe(true);
      expect(isValidRole("MENTOR")).toBe(true);
      expect(isValidRole("MENTEE")).toBe(true);
    });

    it("returns false for invalid role strings", () => {
      expect(isValidRole("SUPERADMIN")).toBe(false);
      expect(isValidRole("")).toBe(false);
      expect(isValidRole("admin")).toBe(false); // case-sensitive
    });
  });
});

// ─── UserStatus ───────────────────────────────────────────────────────────────

describe("UserStatus value object", () => {
  it("has four statuses", () => {
    expect(Object.values(UserStatus)).toHaveLength(4);
    expect(Object.values(UserStatus)).toContain("PENDING_ACTIVATION");
    expect(Object.values(UserStatus)).toContain("ACTIVE");
    expect(Object.values(UserStatus)).toContain("INACTIVE");
    expect(Object.values(UserStatus)).toContain("SUSPENDED");
  });

  it("has Vietnamese labels for all statuses", () => {
    expect(UserStatusLabels[UserStatus.PENDING_ACTIVATION]).toBeDefined();
    expect(UserStatusLabels[UserStatus.ACTIVE]).toBe("Hoạt động");
    expect(UserStatusLabels[UserStatus.SUSPENDED]).toBe("Bị tạm đình chỉ");
  });

  it("has a colour class for every status", () => {
    Object.values(UserStatus).forEach((status) => {
      expect(UserStatusColors[status]).toBeDefined();
    });
  });
});
