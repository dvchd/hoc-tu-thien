import { PrismaClient, User as PrismaUser, UserRole as PrismaUserRole, UserStatus as PrismaUserStatus } from "@prisma/client";

type PrismaTransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
import { IUserRepository, FindUsersOptions, UserCount } from "../../../domain/repositories/IUserRepository";
import { UserEntity } from "../../../domain/entities/User";
import { Email } from "../../../domain/value-objects/Email";
import { UserRole } from "../../../domain/value-objects/UserRole";
import { UserStatus } from "../../../domain/value-objects/UserStatus";

// ─── Prisma User Repository ────────────────────────────────────────────────────
// Infrastructure implementation of IUserRepository using Prisma

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient | PrismaTransactionClient) {}

  // ─── Mapping ──────────────────────────────────────────────────────────────

  private toDomain(prismaUser: PrismaUser): UserEntity {
    return UserEntity.reconstitute(
      prismaUser.id,
      {
        email: Email.create(prismaUser.email),
        name: prismaUser.name,
        image: prismaUser.image,
        role: prismaUser.role as UserRole,
        status: prismaUser.status as UserStatus,
        bio: prismaUser.bio,
        phone: prismaUser.phone,
      },
      {
        createdAt: prismaUser.createdAt,
        updatedAt: prismaUser.updatedAt,
        createdBy: prismaUser.createdBy,
        updatedBy: prismaUser.updatedBy,
        deletedAt: prismaUser.deletedAt,
        deletedBy: prismaUser.deletedBy,
        isDeleted: prismaUser.isDeleted,
        version: prismaUser.version,
      }
    );
  }

  private toPrismaRole(role: UserRole): PrismaUserRole {
    return role as PrismaUserRole;
  }

  private toPrismaStatus(status: UserStatus): PrismaUserStatus {
    return status as PrismaUserStatus;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return user ? this.toDomain(user) : null;
  }

  async findAll(options: FindUsersOptions = {}): Promise<UserEntity[]> {
    const where: any = {};

    if (!options.includeDeleted) {
      where.isDeleted = false;
    }
    if (options.role) {
      where.role = this.toPrismaRole(options.role);
    }
    if (options.status) {
      where.status = this.toPrismaStatus(options.status);
    }
    if (options.search) {
      // SQLite does not support mode: "insensitive" — use case-insensitive LIKE via contains
      const search = options.search.toLowerCase();
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: "desc" },
    });

    return users.map((u: PrismaUser) => this.toDomain(u));
  }

  async count(options: FindUsersOptions = {}): Promise<number> {
    const where: any = {};
    if (!options.includeDeleted) where.isDeleted = false;
    if (options.role) where.role = this.toPrismaRole(options.role);
    if (options.status) where.status = this.toPrismaStatus(options.status);
    return this.prisma.user.count({ where });
  }

  async getUserStats(): Promise<UserCount> {
    const [total, adminCount, mentorCount, menteeCount, pendingCount, activeCount, inactiveCount, suspendedCount] =
      await Promise.all([
        this.prisma.user.count({ where: { isDeleted: false } }),
        this.prisma.user.count({ where: { isDeleted: false, role: "ADMIN" } }),
        this.prisma.user.count({ where: { isDeleted: false, role: "MENTOR" } }),
        this.prisma.user.count({ where: { isDeleted: false, role: "MENTEE" } }),
        this.prisma.user.count({ where: { isDeleted: false, status: "PENDING_ACTIVATION" } }),
        this.prisma.user.count({ where: { isDeleted: false, status: "ACTIVE" } }),
        this.prisma.user.count({ where: { isDeleted: false, status: "INACTIVE" } }),
        this.prisma.user.count({ where: { isDeleted: false, status: "SUSPENDED" } }),
      ]);

    return {
      total,
      byRole: {
        [UserRole.ADMIN]: adminCount,
        [UserRole.MENTOR]: mentorCount,
        [UserRole.MENTEE]: menteeCount,
      },
      byStatus: {
        [UserStatus.PENDING_ACTIVATION]: pendingCount,
        [UserStatus.ACTIVE]: activeCount,
        [UserStatus.INACTIVE]: inactiveCount,
        [UserStatus.SUSPENDED]: suspendedCount,
      },
    };
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }

  // ─── Commands ─────────────────────────────────────────────────────────────

  async save(user: UserEntity): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email.value,
        name: user.name,
        image: user.image,
        role: this.toPrismaRole(user.role),
        status: this.toPrismaStatus(user.status),
        bio: user.bio,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        createdBy: user.createdBy,
        updatedBy: user.updatedBy,
        isDeleted: user.isDeleted,
        version: user.version,
      },
    });
    return this.toDomain(created);
  }

  async update(user: UserEntity): Promise<UserEntity> {
    // Optimistic concurrency: only update if version matches
    const updated = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        version: user.version - 1, // previous version
      },
      data: {
        email: user.email.value,
        name: user.name,
        image: user.image,
        role: this.toPrismaRole(user.role),
        status: this.toPrismaStatus(user.status),
        bio: user.bio,
        phone: user.phone,
        updatedAt: user.updatedAt,
        updatedBy: user.updatedBy,
        deletedAt: user.deletedAt,
        deletedBy: user.deletedBy,
        isDeleted: user.isDeleted,
        version: user.version,
      },
    });

    if (updated.count === 0) {
      throw new Error(
        `Concurrency conflict: User ${user.id} was modified by another process.`
      );
    }

    const result = await this.prisma.user.findUnique({ where: { id: user.id } });
    return this.toDomain(result!);
  }

  async softDelete(id: string, deletedBy?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: deletedBy ?? null,
        updatedAt: new Date(),
        updatedBy: deletedBy ?? null,
      },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  // ─── Audit ────────────────────────────────────────────────────────────────

  async createAuditLog(log: {
    userId: string;
    action: string;
    oldValues?: object;
    newValues?: object;
    performedBy?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.userAuditLog.create({
      data: {
        userId: log.userId,
        action: log.action,
        oldValues: log.oldValues ? JSON.stringify(log.oldValues) : null,
        newValues: log.newValues ? JSON.stringify(log.newValues) : null,
        performedBy: log.performedBy ?? null,
        ipAddress: log.ipAddress ?? null,
        userAgent: log.userAgent ?? null,
      },
    });
  }
}
