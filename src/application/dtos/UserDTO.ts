import { UserRole } from "../../domain/value-objects/UserRole";
import { UserStatus } from "../../domain/value-objects/UserStatus";
import { UserEntity } from "../../domain/entities/User";

// ─── User DTOs ─────────────────────────────────────────────────────────────────
// Data Transfer Objects for crossing layer boundaries

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  bio: string | null;
  phone: string | null;
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  // Soft Delete
  isDeleted: boolean;
  deletedAt: string | null;
  // Versioning
  version: number;
}

export interface CreateUserDTO {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: UserRole;
  createdBy?: string;
}

export interface UpdateUserProfileDTO {
  userId: string;
  name?: string;
  bio?: string;
  phone?: string;
  updatedBy?: string;
}

export interface ChangeUserRoleDTO {
  userId: string;
  newRole: UserRole;
  performedBy: string;
}

export interface ChangeUserStatusDTO {
  userId: string;
  newStatus: UserStatus;
  performedBy: string;
}

export interface UserListDTO {
  users: UserDTO[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Mapper ────────────────────────────────────────────────────────────────────

export class UserMapper {
  static toDTO(entity: UserEntity): UserDTO {
    return {
      id: entity.id,
      email: entity.email.value,
      name: entity.name,
      image: entity.image,
      role: entity.role,
      status: entity.status,
      bio: entity.bio,
      phone: entity.phone,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
      isDeleted: entity.isDeleted,
      deletedAt: entity.deletedAt?.toISOString() ?? null,
      version: entity.version,
    };
  }

  static toDTOList(entities: UserEntity[]): UserDTO[] {
    return entities.map(UserMapper.toDTO);
  }
}
