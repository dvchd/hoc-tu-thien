import { AuditableEntity, AuditableEntityProps } from "./base/AuditableEntity";
import { Email } from "../value-objects/Email";
import { UserRole } from "../value-objects/UserRole";
import { UserStatus } from "../value-objects/UserStatus";

// ─── User Entity Props ─────────────────────────────────────────────────────────

export interface UserProps {
  email: Email;
  name: string | null;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  bio: string | null;
  phone: string | null;
  lateCancellationCount?: number;
}

export interface CreateUserProps {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: UserRole;
  status?: UserStatus;
  bio?: string | null;
  phone?: string | null;
  createdBy?: string;
}

// ─── User Domain Entity ────────────────────────────────────────────────────────

export class UserEntity extends AuditableEntity {
  private _email: Email;
  private _name: string | null;
  private _image: string | null;
  private _role: UserRole;
  private _status: UserStatus;
  private _bio: string | null;
  private _phone: string | null;
  private _lateCancellationCount: number;

  private constructor(
    id: string,
    props: UserProps,
    audit: AuditableEntityProps
  ) {
    super(id, audit);
    this._email = props.email;
    this._name = props.name;
    this._image = props.image;
    this._role = props.role;
    this._status = props.status;
    this._bio = props.bio;
    this._phone = props.phone;
    this._lateCancellationCount = props.lateCancellationCount ?? 0;
  }

  // ─── Factory Methods ───────────────────────────────────────────────────────

  static create(props: CreateUserProps): UserEntity {
    const audit = AuditableEntity.defaultAudit(props.createdBy);

    return new UserEntity(
      props.id,
      {
        email: Email.create(props.email),
        name: props.name ?? null,
        image: props.image ?? null,
        role: props.role ?? UserRole.MENTEE,
        status: props.status ?? UserStatus.PENDING_ACTIVATION,
        bio: props.bio ?? null,
        phone: props.phone ?? null,
      },
      audit
    );
  }

  static reconstitute(
    id: string,
    props: UserProps,
    audit: AuditableEntityProps
  ): UserEntity {
    return new UserEntity(id, props, audit);
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

  get email(): Email { return this._email; }
  get name(): string | null { return this._name; }
  get image(): string | null { return this._image; }
  get role(): UserRole { return this._role; }
  get status(): UserStatus { return this._status; }
  get bio(): string | null { return this._bio; }
  get phone(): string | null { return this._phone; }
  get lateCancellationCount(): number { return this._lateCancellationCount; }

  // ─── Domain Behaviors ──────────────────────────────────────────────────────

  isAdmin(): boolean {
    return this._role === UserRole.ADMIN;
  }

  isMentor(): boolean {
    return this._role === UserRole.MENTOR;
  }

  isMentee(): boolean {
    return this._role === UserRole.MENTEE;
  }

  canBeMentor(): boolean {
    return this.isActive() && this._status === UserStatus.ACTIVE;
  }

  promoteToMentor(updatedBy?: string): UserEntity {
    if (this.isAdmin()) {
      throw new Error("Admin cannot be promoted to Mentor");
    }

    return UserEntity.reconstitute(
      this.id,
      {
        email: this._email,
        name: this._name,
        image: this._image,
        role: UserRole.MENTOR,
        status: this._status,
        bio: this._bio,
        phone: this._phone,
        lateCancellationCount: this._lateCancellationCount,
      },
      {
        ...this.toAuditProps(),
        updatedAt: new Date(),
        updatedBy: updatedBy ?? null,
        version: this.version + 1,
      }
    );
  }

  demoteToMentee(updatedBy?: string): UserEntity {
    if (this.isAdmin()) {
      throw new Error("Admin cannot be demoted to Mentee");
    }

    return UserEntity.reconstitute(
      this.id,
      {
        email: this._email,
        name: this._name,
        image: this._image,
        role: UserRole.MENTEE,
        status: this._status,
        bio: this._bio,
        phone: this._phone,
        lateCancellationCount: this._lateCancellationCount,
      },
      {
        ...this.toAuditProps(),
        updatedAt: new Date(),
        updatedBy: updatedBy ?? null,
        version: this.version + 1,
      }
    );
  }

  updateProfile(
    updates: { name?: string; bio?: string; phone?: string },
    updatedBy?: string
  ): UserEntity {
    return UserEntity.reconstitute(
      this.id,
      {
        email: this._email,
        name: updates.name ?? this._name,
        image: this._image,
        role: this._role,
        status: this._status,
        bio: updates.bio ?? this._bio,
        phone: updates.phone ?? this._phone,
        lateCancellationCount: this._lateCancellationCount,
      },
      {
        ...this.toAuditProps(),
        updatedAt: new Date(),
        updatedBy: updatedBy ?? null,
        version: this.version + 1,
      }
    );
  }

  suspend(updatedBy?: string): UserEntity {
    return UserEntity.reconstitute(
      this.id,
      {
        email: this._email,
        name: this._name,
        image: this._image,
        role: this._role,
        status: UserStatus.SUSPENDED,
        bio: this._bio,
        phone: this._phone,
        lateCancellationCount: this._lateCancellationCount,
      },
      {
        ...this.toAuditProps(),
        updatedAt: new Date(),
        updatedBy: updatedBy ?? null,
        version: this.version + 1,
      }
    );
  }

  activate(updatedBy?: string): UserEntity {
    return UserEntity.reconstitute(
      this.id,
      {
        email: this._email,
        name: this._name,
        image: this._image,
        role: this._role,
        status: UserStatus.ACTIVE,
        bio: this._bio,
        phone: this._phone,
        lateCancellationCount: this._lateCancellationCount,
      },
      {
        ...this.toAuditProps(),
        updatedAt: new Date(),
        updatedBy: updatedBy ?? null,
        version: this.version + 1,
      }
    );
  }

  softDelete(deletedBy?: string): UserEntity {
    return UserEntity.reconstitute(
      this.id,
      {
        email: this._email,
        name: this._name,
        image: this._image,
        role: this._role,
        status: this._status,
        bio: this._bio,
        phone: this._phone,
        lateCancellationCount: this._lateCancellationCount,
      },
      {
        ...this.toAuditProps(),
        updatedAt: new Date(),
        updatedBy: deletedBy ?? null,
        deletedAt: new Date(),
        deletedBy: deletedBy ?? null,
        isDeleted: true,
        version: this.version + 1,
      }
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private toAuditProps() {
    return {
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      deletedAt: this.deletedAt,
      deletedBy: this.deletedBy,
      isDeleted: this.isDeleted,
      version: this.version,
    };
  }
}
