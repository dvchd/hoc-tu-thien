import { IUnitOfWork } from "../../interfaces/IUnitOfWork";
import {
  CreateUserDTO,
  UpdateUserProfileDTO,
  ChangeUserRoleDTO,
  UserDTO,
  UserMapper,
  UserListDTO,
} from "../../dtos/UserDTO";
import { UserEntity } from "../../../domain/entities/User";
import { UserRole } from "../../../domain/value-objects/UserRole";
import { UserStatus } from "../../../domain/value-objects/UserStatus";
import { FindUsersOptions } from "../../../domain/repositories/IUserRepository";

// ─── FindOrCreateUser Use Case ────────────────────────────────────────────────
// Called during Google OAuth login. Creates user if new, returns existing if not.

export class FindOrCreateUserUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: CreateUserDTO): Promise<UserDTO> {
    return this.uow.execute(async (uow) => {
      const existing = await uow.users.findByEmail(input.email);

      if (existing) {
        // Update image/name if changed from OAuth provider
        const needsUpdate =
          (input.name && existing.name !== input.name) ||
          (input.image && existing.image !== input.image);

        if (needsUpdate) {
          const updated = existing.updateProfile(
            { name: input.name ?? undefined },
            "oauth-sync"
          );
          const saved = await uow.users.update(updated);

          await uow.users.createAuditLog({
            userId: saved.id,
            action: "OAUTH_SYNC",
            oldValues: { name: existing.name },
            newValues: { name: saved.name },
            performedBy: "system",
          });

          return UserMapper.toDTO(saved);
        }

        return UserMapper.toDTO(existing);
      }

      // Create new user with default MENTEE role and PENDING_ACTIVATION status
      const newUser = UserEntity.create({
        id: input.id,
        email: input.email,
        name: input.name,
        image: input.image,
        role: UserRole.MENTEE,
        status: UserStatus.PENDING_ACTIVATION,
        createdBy: "google-oauth",
      });

      const saved = await uow.users.save(newUser);

      await uow.users.createAuditLog({
        userId: saved.id,
        action: "CREATE",
        newValues: { email: saved.email.value, role: saved.role },
        performedBy: "google-oauth",
      });

      return UserMapper.toDTO(saved);
    });
  }
}

// ─── GetUser Use Case ─────────────────────────────────────────────────────────

export class GetUserUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async byId(id: string): Promise<UserDTO | null> {
    const user = await this.uow.users.findById(id);
    return user ? UserMapper.toDTO(user) : null;
  }

  async byEmail(email: string): Promise<UserDTO | null> {
    const user = await this.uow.users.findByEmail(email);
    return user ? UserMapper.toDTO(user) : null;
  }
}

// ─── ListUsers Use Case ────────────────────────────────────────────────────────

export class ListUsersUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    options: FindUsersOptions & { page?: number; pageSize?: number }
  ): Promise<UserListDTO> {
    const pageSize = options.pageSize ?? 10;
    const page = options.page ?? 1;
    const skip = (page - 1) * pageSize;

    const [users, total] = await Promise.all([
      this.uow.users.findAll({ ...options, skip, take: pageSize }),
      this.uow.users.count(options),
    ]);

    return {
      users: UserMapper.toDTOList(users),
      total,
      page,
      pageSize,
    };
  }
}

// ─── ChangeUserRole Use Case ──────────────────────────────────────────────────

export class ChangeUserRoleUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: ChangeUserRoleDTO): Promise<UserDTO> {
    return this.uow.execute(async (uow) => {
      const user = await uow.users.findById(input.userId);
      if (!user) throw new Error("User not found");

      const performer = await uow.users.findById(input.performedBy);
      if (!performer || !performer.isAdmin()) {
        throw new Error("Only admins can change user roles");
      }

      const oldRole = user.role;
      let updated: UserEntity;

      if (input.newRole === UserRole.MENTOR) {
        updated = user.promoteToMentor(input.performedBy);
      } else if (input.newRole === UserRole.MENTEE) {
        updated = user.demoteToMentee(input.performedBy);
      } else {
        throw new Error("Invalid role transition");
      }

      const saved = await uow.users.update(updated);

      await uow.users.createAuditLog({
        userId: saved.id,
        action: "ROLE_CHANGE",
        oldValues: { role: oldRole },
        newValues: { role: saved.role },
        performedBy: input.performedBy,
      });

      return UserMapper.toDTO(saved);
    });
  }
}

// ─── UpdateUserProfile Use Case ───────────────────────────────────────────────

export class UpdateUserProfileUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: UpdateUserProfileDTO): Promise<UserDTO> {
    return this.uow.execute(async (uow) => {
      const user = await uow.users.findById(input.userId);
      if (!user) throw new Error("User not found");

      const oldValues = { name: user.name, bio: user.bio, phone: user.phone };
      const updated = user.updateProfile(
        { name: input.name, bio: input.bio, phone: input.phone },
        input.updatedBy
      );

      const saved = await uow.users.update(updated);

      await uow.users.createAuditLog({
        userId: saved.id,
        action: "PROFILE_UPDATE",
        oldValues,
        newValues: { name: saved.name, bio: saved.bio, phone: saved.phone },
        performedBy: input.updatedBy,
      });

      return UserMapper.toDTO(saved);
    });
  }
}

// ─── SoftDeleteUser Use Case ──────────────────────────────────────────────────

export class SoftDeleteUserUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(userId: string, performedBy: string): Promise<void> {
    return this.uow.execute(async (uow) => {
      const user = await uow.users.findById(userId);
      if (!user) throw new Error("User not found");

      const performer = await uow.users.findById(performedBy);
      if (!performer || !performer.isAdmin()) {
        throw new Error("Only admins can delete users");
      }

      await uow.users.softDelete(userId, performedBy);

      await uow.users.createAuditLog({
        userId,
        action: "SOFT_DELETE",
        oldValues: { isDeleted: false },
        newValues: { isDeleted: true },
        performedBy,
      });
    });
  }
}
