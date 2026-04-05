// ─── Domain Event ─────────────────────────────────────────────────────────────
// Base class for all domain events.
// Follows the Domain Events pattern from DDD.

export abstract class DomainEvent {
  readonly occurredAt: Date;
  readonly eventId: string;

  constructor() {
    this.occurredAt = new Date();
    this.eventId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  abstract get eventName(): string;
}

// ─── Concrete Domain Events ────────────────────────────────────────────────────

export class UserCreatedEvent extends DomainEvent {
  get eventName() { return "user.created"; }

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly role: string
  ) {
    super();
  }
}

export class UserRoleChangedEvent extends DomainEvent {
  get eventName() { return "user.role.changed"; }

  constructor(
    public readonly userId: string,
    public readonly oldRole: string,
    public readonly newRole: string,
    public readonly changedBy: string
  ) {
    super();
  }
}

export class UserSoftDeletedEvent extends DomainEvent {
  get eventName() { return "user.soft_deleted"; }

  constructor(
    public readonly userId: string,
    public readonly deletedBy: string
  ) {
    super();
  }
}

// ─── Event Bus (simple in-memory implementation) ──────────────────────────────

type EventHandler<T extends DomainEvent> = (event: T) => Promise<void> | void;

class DomainEventBus {
  private handlers = new Map<string, EventHandler<any>[]>();

  on<T extends DomainEvent>(eventName: string, handler: EventHandler<T>) {
    const existing = this.handlers.get(eventName) ?? [];
    this.handlers.set(eventName, [...existing, handler]);
  }

  async dispatch(event: DomainEvent) {
    const handlers = this.handlers.get(event.eventName) ?? [];
    await Promise.all(handlers.map((h) => h(event)));
  }
}

export const domainEventBus = new DomainEventBus();
