import {
  FindOrCreateUserUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  ChangeUserRoleUseCase,
  UpdateUserProfileUseCase,
  SoftDeleteUserUseCase,
} from "@/application/use-cases/user/UserUseCases";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import {
  buildUser,
  buildAdmin,
  buildMentor,
  createMockUnitOfWork,
} from "@/__tests__/helpers";

describe("FindOrCreateUserUseCase", () => {
  it("returns existing user if found by email", async () => {
    const existing = buildUser({ email: "existing@test.com" });
    const uow = createMockUnitOfWork();
    uow.users.findByEmail.mockResolvedValue(existing);

    const useCase = new FindOrCreateUserUseCase(uow);
    const result = await useCase.execute({
      id: "new_id",
      email: "existing@test.com",
    });

    expect(result.email).toBe("existing@test.com");
    expect(uow.users.save).not.toHaveBeenCalled();
  });

  it("creates a new user with MENTEE role when not found", async () => {
    const uow = createMockUnitOfWork();
    uow.users.findByEmail.mockResolvedValue(null);

    const savedUser = buildUser({
      id: "new_001",
      email: "new@test.com",
      role: UserRole.MENTEE,
    });
    uow.users.save.mockResolvedValue(savedUser);

    const useCase = new FindOrCreateUserUseCase(uow);
    const result = await useCase.execute({
      id: "new_001",
      email: "new@test.com",
    });

    expect(uow.users.save).toHaveBeenCalledTimes(1);
    expect(result.role).toBe(UserRole.MENTEE);
  });

  it("creates audit log for new user creation", async () => {
    const uow = createMockUnitOfWork();
    uow.users.findByEmail.mockResolvedValue(null);
    const saved = buildUser({ id: "u1", email: "log@test.com" });
    uow.users.save.mockResolvedValue(saved);

    const useCase = new FindOrCreateUserUseCase(uow);
    await useCase.execute({ id: "u1", email: "log@test.com" });

    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CREATE" })
    );
  });
});

// ─── GetUserUseCase ───────────────────────────────────────────────────────────

describe("GetUserUseCase", () => {
  it("returns DTO when user is found by ID", async () => {
    const user = buildUser({ id: "u1", email: "a@b.com" });
    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(user);

    const result = await new GetUserUseCase(uow).byId("u1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("u1");
    expect(result!.email).toBe("a@b.com");
  });

  it("returns null when user not found", async () => {
    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(null);

    const result = await new GetUserUseCase(uow).byId("nonexistent");
    expect(result).toBeNull();
  });

  it("returns DTO when user found by email", async () => {
    const user = buildUser({ email: "find@test.com" });
    const uow = createMockUnitOfWork();
    uow.users.findByEmail.mockResolvedValue(user);

    const result = await new GetUserUseCase(uow).byEmail("find@test.com");
    expect(result!.email).toBe("find@test.com");
  });
});

// ─── ListUsersUseCase ─────────────────────────────────────────────────────────

describe("ListUsersUseCase", () => {
  it("returns paginated user list with total", async () => {
    const users = [buildUser({ id: "u1" }), buildUser({ id: "u2", email: "b@b.com" })];
    const uow = createMockUnitOfWork();
    uow.users.findAll.mockResolvedValue(users);
    uow.users.count.mockResolvedValue(25);

    const result = await new ListUsersUseCase(uow).execute({ page: 1, pageSize: 10 });

    expect(result.users).toHaveLength(2);
    expect(result.total).toBe(25);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it("calculates skip offset from page number", async () => {
    const uow = createMockUnitOfWork();
    uow.users.findAll.mockResolvedValue([]);
    uow.users.count.mockResolvedValue(0);

    await new ListUsersUseCase(uow).execute({ page: 3, pageSize: 5 });

    expect(uow.users.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 })
    );
  });

  it("defaults to page 1 and pageSize 10", async () => {
    const uow = createMockUnitOfWork();
    uow.users.findAll.mockResolvedValue([]);
    uow.users.count.mockResolvedValue(0);

    const result = await new ListUsersUseCase(uow).execute({});

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });
});

// ─── ChangeUserRoleUseCase ────────────────────────────────────────────────────

describe("ChangeUserRoleUseCase", () => {
  it("promotes a MENTEE to MENTOR when admin performs action", async () => {
    const mentee = buildUser({ id: "mentee_01", role: UserRole.MENTEE });
    const admin = buildAdmin();
    const promoted = mentee.promoteToMentor(admin.id);

    const uow = createMockUnitOfWork();
    uow.users.findById
      .mockResolvedValueOnce(mentee)   // load target user
      .mockResolvedValueOnce(admin);   // load performer
    uow.users.update.mockResolvedValue(promoted);

    const result = await new ChangeUserRoleUseCase(uow).execute({
      userId: "mentee_01",
      newRole: UserRole.MENTOR,
      performedBy: admin.id,
    });

    expect(result.role).toBe(UserRole.MENTOR);
    expect(uow.users.update).toHaveBeenCalledTimes(1);
  });

  it("throws when performer is not an admin", async () => {
    const mentee = buildUser({ id: "m1" });
    const notAdmin = buildUser({ id: "not_admin", role: UserRole.MENTEE });

    const uow = createMockUnitOfWork();
    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(notAdmin);

    await expect(
      new ChangeUserRoleUseCase(uow).execute({
        userId: "m1",
        newRole: UserRole.MENTOR,
        performedBy: "not_admin",
      })
    ).rejects.toThrow("Only admins can change user roles");
  });

  it("throws when target user does not exist", async () => {
    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(null);

    await expect(
      new ChangeUserRoleUseCase(uow).execute({
        userId: "ghost",
        newRole: UserRole.MENTOR,
        performedBy: "admin",
      })
    ).rejects.toThrow("User not found");
  });

  it("creates audit log after role change", async () => {
    const mentee = buildUser({ id: "m1", role: UserRole.MENTEE });
    const admin = buildAdmin();
    const promoted = mentee.promoteToMentor(admin.id);

    const uow = createMockUnitOfWork();
    uow.users.findById
      .mockResolvedValueOnce(mentee)
      .mockResolvedValueOnce(admin);
    uow.users.update.mockResolvedValue(promoted);

    await new ChangeUserRoleUseCase(uow).execute({
      userId: "m1",
      newRole: UserRole.MENTOR,
      performedBy: admin.id,
    });

    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ROLE_CHANGE",
        oldValues: expect.objectContaining({ role: UserRole.MENTEE }),
        newValues: expect.objectContaining({ role: UserRole.MENTOR }),
      })
    );
  });
});

// ─── UpdateUserProfileUseCase ─────────────────────────────────────────────────

describe("UpdateUserProfileUseCase", () => {
  it("updates name, bio, and phone", async () => {
    const user = buildUser({ id: "u1", name: "Old" });
    const updated = user.updateProfile({ name: "New Name", bio: "bio" }, "u1");

    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(user);
    uow.users.update.mockResolvedValue(updated);

    const result = await new UpdateUserProfileUseCase(uow).execute({
      userId: "u1",
      name: "New Name",
      bio: "bio",
      updatedBy: "u1",
    });

    expect(result.name).toBe("New Name");
    expect(result.bio).toBe("bio");
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PROFILE_UPDATE" })
    );
  });

  it("throws when user not found", async () => {
    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(null);

    await expect(
      new UpdateUserProfileUseCase(uow).execute({ userId: "ghost" })
    ).rejects.toThrow("User not found");
  });
});

// ─── SoftDeleteUserUseCase ────────────────────────────────────────────────────

describe("SoftDeleteUserUseCase", () => {
  it("soft deletes user when admin performs action", async () => {
    const target = buildUser({ id: "target" });
    const admin = buildAdmin();

    const uow = createMockUnitOfWork();
    uow.users.findById
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce(admin);

    await new SoftDeleteUserUseCase(uow).execute("target", admin.id);

    expect(uow.users.softDelete).toHaveBeenCalledWith("target", admin.id);
  });

  it("throws when performer is not admin", async () => {
    const target = buildUser({ id: "target" });
    const notAdmin = buildUser({ id: "regular", role: UserRole.MENTEE });

    const uow = createMockUnitOfWork();
    uow.users.findById
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce(notAdmin);

    await expect(
      new SoftDeleteUserUseCase(uow).execute("target", "regular")
    ).rejects.toThrow("Only admins can delete users");
  });

  it("throws when target user not found", async () => {
    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(null);

    await expect(
      new SoftDeleteUserUseCase(uow).execute("ghost", "admin")
    ).rejects.toThrow("User not found");
  });

  it("creates audit log for deletion", async () => {
    const target = buildUser({ id: "tgt" });
    const admin = buildAdmin();

    const uow = createMockUnitOfWork();
    uow.users.findById
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce(admin);

    await new SoftDeleteUserUseCase(uow).execute("tgt", admin.id);

    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SOFT_DELETE" })
    );
  });
});
