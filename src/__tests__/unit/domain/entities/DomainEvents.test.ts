import {
  DomainEvent,
  UserCreatedEvent,
  UserRoleChangedEvent,
  UserSoftDeletedEvent,
  domainEventBus,
} from "@/domain/events/DomainEvents";

describe("DomainEvent base class", () => {
  class TestEvent extends DomainEvent {
    get eventName() { return "test.event"; }
  }

  it("generates a unique eventId", () => {
    const e1 = new TestEvent();
    const e2 = new TestEvent();
    expect(e1.eventId).toBeDefined();
    expect(e1.eventId).not.toBe(e2.eventId);
  });

  it("sets occurredAt near current time", () => {
    const before = new Date();
    const event = new TestEvent();
    const after = new Date();
    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe("UserCreatedEvent", () => {
  it("has correct eventName", () => {
    const event = new UserCreatedEvent("u1", "a@b.com", "MENTEE");
    expect(event.eventName).toBe("user.created");
  });

  it("stores payload correctly", () => {
    const event = new UserCreatedEvent("user_123", "test@example.com", "MENTOR");
    expect(event.userId).toBe("user_123");
    expect(event.email).toBe("test@example.com");
    expect(event.role).toBe("MENTOR");
  });
});

describe("UserRoleChangedEvent", () => {
  it("stores old and new role", () => {
    const event = new UserRoleChangedEvent("u1", "MENTEE", "MENTOR", "admin_001");
    expect(event.oldRole).toBe("MENTEE");
    expect(event.newRole).toBe("MENTOR");
    expect(event.changedBy).toBe("admin_001");
    expect(event.eventName).toBe("user.role.changed");
  });
});

describe("UserSoftDeletedEvent", () => {
  it("stores userId and deletedBy", () => {
    const event = new UserSoftDeletedEvent("u1", "admin_001");
    expect(event.userId).toBe("u1");
    expect(event.deletedBy).toBe("admin_001");
    expect(event.eventName).toBe("user.soft_deleted");
  });
});

describe("DomainEventBus", () => {
  it("dispatches event to registered handler", async () => {
    const handler = jest.fn();
    domainEventBus.on("user.created", handler);

    const event = new UserCreatedEvent("u1", "a@b.com", "MENTEE");
    await domainEventBus.dispatch(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it("dispatches to multiple handlers for the same event", async () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    domainEventBus.on("user.soft_deleted", h1);
    domainEventBus.on("user.soft_deleted", h2);

    const event = new UserSoftDeletedEvent("u2", "admin");
    await domainEventBus.dispatch(event);

    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it("does nothing if no handler is registered for event", async () => {
    // Should not throw
    await expect(
      domainEventBus.dispatch(new UserRoleChangedEvent("u1", "MENTEE", "MENTOR", "admin"))
    ).resolves.not.toThrow();
  });

  it("awaits async handlers", async () => {
    const results: string[] = [];
    domainEventBus.on("user.created", async () => {
      await new Promise((r) => setTimeout(r, 10));
      results.push("async done");
    });

    await domainEventBus.dispatch(new UserCreatedEvent("u3", "c@d.com", "MENTEE"));
    expect(results).toContain("async done");
  });
});
