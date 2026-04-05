import { UserMapper } from "@/application/dtos/UserDTO";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { buildUser, buildAdmin, buildMentor } from "@/__tests__/helpers";

describe("UserMapper.toDTO()", () => {
  it("maps all base fields correctly", () => {
    const user = buildUser({
      id: "u_map_01",
      email: "map@test.com",
      name: "Map User",
      bio: "some bio",
      phone: "0901234567",
    });

    const dto = UserMapper.toDTO(user);

    expect(dto.id).toBe("u_map_01");
    expect(dto.email).toBe("map@test.com");
    expect(dto.name).toBe("Map User");
    expect(dto.bio).toBe("some bio");
    expect(dto.phone).toBe("0901234567");
  });

  it("maps role correctly for each role type", () => {
    expect(UserMapper.toDTO(buildAdmin()).role).toBe(UserRole.ADMIN);
    expect(UserMapper.toDTO(buildMentor()).role).toBe(UserRole.MENTOR);
    expect(UserMapper.toDTO(buildUser()).role).toBe(UserRole.MENTEE);
  });

  it("serialises dates to ISO strings", () => {
    const dto = UserMapper.toDTO(buildUser());
    expect(() => new Date(dto.createdAt)).not.toThrow();
    expect(() => new Date(dto.updatedAt)).not.toThrow();
    expect(dto.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("maps deletedAt to null when not deleted", () => {
    const dto = UserMapper.toDTO(buildUser());
    expect(dto.isDeleted).toBe(false);
    expect(dto.deletedAt).toBeNull();
  });

  it("maps deletedAt to ISO string when soft-deleted", () => {
    const deleted = buildUser().softDelete("admin");
    const dto = UserMapper.toDTO(deleted);
    expect(dto.isDeleted).toBe(true);
    expect(dto.deletedAt).not.toBeNull();
    expect(dto.deletedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("includes version number in DTO", () => {
    const dto = UserMapper.toDTO(buildUser());
    expect(dto.version).toBe(1);
  });

  it("incremented version reflects after update", () => {
    const updated = buildUser().updateProfile({ name: "New" });
    const dto = UserMapper.toDTO(updated);
    expect(dto.version).toBe(2);
  });
});

describe("UserMapper.toDTOList()", () => {
  it("maps an empty list", () => {
    expect(UserMapper.toDTOList([])).toEqual([]);
  });

  it("maps multiple entities", () => {
    const users = [
      buildUser({ id: "u1" }),
      buildUser({ id: "u2", email: "b@b.com" }),
      buildAdmin(),
    ];
    const dtos = UserMapper.toDTOList(users);
    expect(dtos).toHaveLength(3);
    expect(dtos.map((d) => d.id)).toEqual(["u1", "u2", "admin_001"]);
  });
});
