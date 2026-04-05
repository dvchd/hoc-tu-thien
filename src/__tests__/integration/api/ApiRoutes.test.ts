/**
 * Integration tests for API routes
 *
 * These tests mock the auth session and use cases,
 * then call the API handlers directly to validate:
 * - HTTP status codes
 * - Response shapes
 * - Auth guards (401/403)
 * - Input validation (400)
 * - Business rule errors (400)
 */

import { NextRequest } from "next/server";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { PaymentStatus, PaymentType } from "@/domain/value-objects/Payment";
import { buildPaymentRecord, buildSessionRecord } from "@/__tests__/helpers";

// ─── Mock NextAuth ────────────────────────────────────────────────────────────

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// ─── Mock use-cases container ─────────────────────────────────────────────────

jest.mock("@/lib/container", () => ({
  createUseCases: jest.fn(),
}));

import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockCreateUseCases = createUseCases as jest.MockedFunction<typeof createUseCases>;

// ─── Session factory ──────────────────────────────────────────────────────────

function makeSession(role: UserRole = UserRole.MENTEE, status = UserStatus.ACTIVE) {
  return {
    user: {
      id: "session_user_id",
      email: "user@test.com",
      name: "Test User",
      role,
      status,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  } as any;
}

function makeRequest(body: object, method = "POST"): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ─── POST /api/payments/verify ────────────────────────────────────────────────

describe("POST /api/payments/verify", () => {
  const { POST } = require("@/app/api/payments/verify/route");

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = makeRequest({ paymentId: "pay_001" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing paymentId", async () => {
    mockAuth.mockResolvedValueOnce(makeSession());
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 with success on verified payment", async () => {
    mockAuth.mockResolvedValueOnce(makeSession());
    const verifyPayment = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        message: "Kích hoạt tài khoản thành công!",
        payment: buildPaymentRecord({ status: PaymentStatus.VERIFIED }),
      }),
    };
    mockCreateUseCases.mockReturnValueOnce({ verifyPayment } as any);

    const req = makeRequest({ paymentId: "pay_001" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 200 with success=false when not found yet", async () => {
    mockAuth.mockResolvedValueOnce(makeSession());
    const verifyPayment = {
      execute: jest.fn().mockResolvedValue({
        success: false,
        message: "Chưa tìm thấy giao dịch",
      }),
    };
    mockCreateUseCases.mockReturnValueOnce({ verifyPayment } as any);

    const req = makeRequest({ paymentId: "pay_001" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
  });
});

// ─── POST /api/sessions ───────────────────────────────────────────────────────

describe("POST /api/sessions", () => {
  const { POST } = require("@/app/api/sessions/route");

  const validBody = {
    mentorId: "mentor_001",
    title: "Học ReactJS",
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    durationMinutes: 60,
  };

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 for title too short", async () => {
    mockAuth.mockResolvedValueOnce(makeSession());
    const res = await POST(makeRequest({ ...validBody, title: "X" }));
    expect(res.status).toBe(400);
  });

  it("returns 201 on successful booking", async () => {
    mockAuth.mockResolvedValueOnce(makeSession());
    const session = buildSessionRecord();
    const bookSession = { execute: jest.fn().mockResolvedValue(session) };
    mockCreateUseCases.mockReturnValueOnce({ bookSession } as any);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
  });

  it("returns 400 when use case throws business error", async () => {
    mockAuth.mockResolvedValueOnce(makeSession());
    const bookSession = {
      execute: jest.fn().mockRejectedValue(new Error("Tài khoản chưa kích hoạt")),
    };
    mockCreateUseCases.mockReturnValueOnce({ bookSession } as any);

    const res = await POST(makeRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Tài khoản chưa kích hoạt");
  });
});

// ─── PATCH /api/sessions/[id] ─────────────────────────────────────────────────

describe("PATCH /api/sessions/[id]", () => {
  const { PATCH } = require("@/app/api/sessions/[id]/route");
  const params = { params: { id: "sess_001" } };

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ action: "confirm" }, "PATCH"), params);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid action", async () => {
    mockAuth.mockResolvedValueOnce(makeSession(UserRole.MENTOR));
    const res = await PATCH(
      makeRequest({ action: "invalid_action" }, "PATCH"),
      params
    );
    expect(res.status).toBe(400);
  });

  it("confirms session as mentor", async () => {
    mockAuth.mockResolvedValueOnce(makeSession(UserRole.MENTOR));
    const confirmed = buildSessionRecord({ status: "CONFIRMED" as any });
    const confirmSession = { execute: jest.fn().mockResolvedValue(confirmed) };
    mockCreateUseCases.mockReturnValueOnce({
      confirmSession,
      completeSession: { execute: jest.fn() },
      cancelSession: { execute: jest.fn() },
      rateSession: { execute: jest.fn() },
    } as any);

    const res = await PATCH(makeRequest({ action: "confirm" }, "PATCH"), params);
    expect(res.status).toBe(200);
  });

  it("requires rating field for rate action", async () => {
    mockAuth.mockResolvedValueOnce(makeSession());
    const res = await PATCH(
      makeRequest({ action: "rate" }, "PATCH"), // missing rating
      params
    );
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/admin/users/role ──────────────────────────────────────────────

describe("PATCH /api/admin/users/role", () => {
  const { PATCH } = require("@/app/api/admin/users/role/route");

  it("returns 403 for non-admin user", async () => {
    mockAuth.mockResolvedValueOnce(makeSession(UserRole.MENTEE));
    const res = await PATCH(
      makeRequest({ userId: "u1", newRole: "MENTOR" }, "PATCH")
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 for mentor trying to change roles", async () => {
    mockAuth.mockResolvedValueOnce(makeSession(UserRole.MENTOR));
    const res = await PATCH(
      makeRequest({ userId: "u1", newRole: "MENTEE" }, "PATCH")
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid role value", async () => {
    mockAuth.mockResolvedValueOnce(makeSession(UserRole.ADMIN));
    const res = await PATCH(
      makeRequest({ userId: "u1", newRole: "SUPERADMIN" }, "PATCH")
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful role change by admin", async () => {
    mockAuth.mockResolvedValueOnce(makeSession(UserRole.ADMIN));
    const changeUserRole = {
      execute: jest.fn().mockResolvedValue({
        id: "u1",
        role: UserRole.MENTOR,
        email: "u@t.com",
      }),
    };
    mockCreateUseCases.mockReturnValueOnce({ changeUserRole } as any);

    const res = await PATCH(
      makeRequest({ userId: "u1", newRole: "MENTOR" }, "PATCH")
    );
    expect(res.status).toBe(200);
  });
});

// ─── DELETE /api/admin/users/[id] ─────────────────────────────────────────────

describe("DELETE /api/admin/users/[id]", () => {
  const { DELETE } = require("@/app/api/admin/users/[id]/route");
  const params = { params: { id: "target_user_id" } };

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValueOnce(makeSession(UserRole.MENTEE));
    const req = new NextRequest("http://localhost:3000/api/test", { method: "DELETE" });
    const res = await DELETE(req, params);
    expect(res.status).toBe(403);
  });

  it("returns 400 when admin tries to delete themselves", async () => {
    const session = makeSession(UserRole.ADMIN);
    session.user.id = "target_user_id"; // same as params.id
    mockAuth.mockResolvedValueOnce(session);

    const req = new NextRequest("http://localhost:3000/api/test", { method: "DELETE" });
    const res = await DELETE(req, params);
    expect(res.status).toBe(400);
  });

  it("returns 200 when admin successfully deletes another user", async () => {
    mockAuth.mockResolvedValueOnce(makeSession(UserRole.ADMIN));
    const softDeleteUser = { execute: jest.fn().mockResolvedValue(undefined) };
    mockCreateUseCases.mockReturnValueOnce({ softDeleteUser } as any);

    const req = new NextRequest("http://localhost:3000/api/test", { method: "DELETE" });
    const res = await DELETE(req, params);
    expect(res.status).toBe(200);
  });
});
