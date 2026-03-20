import { UserEntity } from "../entities/User";
import { UserRole } from "../value-objects/UserRole";
import { UserStatus } from "../value-objects/UserStatus";

// ─── Query Options ─────────────────────────────────────────────────────────────

export interface FindUsersOptions {
  role?: UserRole;
  status?: UserStatus;
  includeDeleted?: boolean;
  skip?: number;
  take?: number;
  search?: string;
}

export interface UserCount {
  total: number;
  byRole: Record<UserRole, number>;
  byStatus: Record<UserStatus, number>;
}

// ─── IUserRepository Interface ────────────────────────────────────────────────
// This is the Domain Repository Interface (Port in Hexagonal Architecture)
// Implementations live in the Infrastructure layer

export interface IUserRepository {
  // Queries
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findAll(options?: FindUsersOptions): Promise<UserEntity[]>;
  count(options?: FindUsersOptions): Promise<number>;
  getUserStats(): Promise<UserCount>;
  existsByEmail(email: string): Promise<boolean>;

  // Commands
  save(user: UserEntity): Promise<UserEntity>;
  update(user: UserEntity): Promise<UserEntity>;
  softDelete(id: string, deletedBy?: string): Promise<void>;
  hardDelete(id: string): Promise<void>;

  // Audit
  createAuditLog(log: {
    userId: string;
    action: string;
    oldValues?: object;
    newValues?: object;
    performedBy?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void>;
}
