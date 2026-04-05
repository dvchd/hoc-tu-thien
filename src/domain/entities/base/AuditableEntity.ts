// ─── Base Entity ──────────────────────────────────────────────────────────────
// Implements Audit, Versioning, and Soft Delete patterns

export abstract class BaseEntity {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  equals(other: BaseEntity): boolean {
    if (!(other instanceof BaseEntity)) return false;
    return this.id === other.id;
  }
}

// ─── Auditable Entity ─────────────────────────────────────────────────────────
// All domain entities that need audit trails extend this

export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface SoftDeleteFields {
  deletedAt: Date | null;
  deletedBy: string | null;
  isDeleted: boolean;
}

export interface VersionedFields {
  version: number;
}

export type AuditableEntityProps = AuditFields & SoftDeleteFields & VersionedFields;

export abstract class AuditableEntity extends BaseEntity {
  // Audit
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: string | null;
  readonly updatedBy: string | null;

  // Soft Delete
  readonly deletedAt: Date | null;
  readonly deletedBy: string | null;
  readonly isDeleted: boolean;

  // Optimistic Concurrency / Versioning
  readonly version: number;

  constructor(id: string, audit: AuditableEntityProps) {
    super(id);
    this.createdAt = audit.createdAt;
    this.updatedAt = audit.updatedAt;
    this.createdBy = audit.createdBy;
    this.updatedBy = audit.updatedBy;
    this.deletedAt = audit.deletedAt;
    this.deletedBy = audit.deletedBy;
    this.isDeleted = audit.isDeleted;
    this.version = audit.version;
  }

  isActive(): boolean {
    return !this.isDeleted;
  }

  /**
   * Factory helper to create a default audit block for new entities
   */
  static defaultAudit(createdBy?: string): AuditableEntityProps {
    const now = new Date();
    return {
      createdAt: now,
      updatedAt: now,
      createdBy: createdBy ?? null,
      updatedBy: createdBy ?? null,
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
      version: 1,
    };
  }
}
