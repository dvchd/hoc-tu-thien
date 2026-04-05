/**
 * Integration Tests – Charity Account Verification API Routes
 *
 * Tests cho 2 endpoints:
 *   POST  /api/admin/charity-accounts/[id]/verify  → Initiate probe payment
 *   PATCH /api/admin/charity-accounts/[id]/verify  → Confirm verification
 */

import { NextRequest } from "next/server";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { CharityAccountVerificationStatus, CHARITY_ACCOUNT_VERIFICATION_AMOUNT } from "@/domain/value-objects/Payment";

// ─── Mock auth + container ────────────────────────────────────────────────────

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/container", () => ({ createUseCases: jest.fn() }));

import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockCreateUseCases = createUseCases as jest.MockedFunction<typeof createUseCases>;

// ─── Import route handlers ────────────────────────────────────────────────────

import {
  POST as initiateVerify,
  PATCH as confirmVerify,
} from "@/app/api/admin/charity-accounts/[id]/verify/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAdminSession() {
  return {
    user: {
      id: "admin_001",
      email: "admin@test.com",
      name: "Admin User",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  } as any;
}

function makeMenteeSession() {
  return {
    user: {
      id: "mentee_001",
      email: "mentee@test.com",
      name: "Mentee User",
      role: UserRole.MENTEE,
      status: UserStatus.ACTIVE,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  } as any;
}

function makeRequest(method = "POST"): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/admin/charity-accounts/charity_001/verify",
    { method }
  );
}

const routeParams = { params: { id: "charity_001" } };

function buildVerificationInfo(overrides = {}) {
  return {
    paymentId: "probe_pay_001",
    transactionCode: "HOCTUTHIEN XACTHUC ABCDEFGH",
    shortCode: "ABCDEFGH",
    amount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
    tnAccountNo: "1234567890",
    tnAccountName: "Quỹ Từ Thiện ABC",
    qrImageUrl: "https://img.vietqr.io/image/970422-1234567890-compact2.png?amount=1000&addInfo=HOCTUTHIEN+XACTHUC+ABCDEFGH&accountName=Qu%E1%BB%B9+T%E1%BB%AB+Thi%E1%BB%87n+ABC",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    accountName: "Quỹ Từ Thiện ABC",
    accountNo: "1234567890",
    ...overrides,
  };
}

function buildCharityAccount(overrides = {}) {
  return {
    id: "charity_001",
    name: "Quỹ Từ Thiện ABC",
    accountNo: "1234567890",
    bankName: "MB Bank",
    campaignKeyword: null,
    description: null,
    isActive: true,
    isDefault: false,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "admin_001",
    isDeleted: false,
    deletedAt: null,
    verificationStatus: CharityAccountVerificationStatus.UNVERIFIED,
    verificationPaymentId: null,
    verificationShortCode: null,
    verifiedAt: null,
    verifiedBy: null,
    verificationNote: null,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/charity-accounts/[id]/verify
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/admin/charity-accounts/[id]/verify – Initiate Verification", () => {
  afterEach(() => jest.clearAllMocks());

  it("trả về 200 với thông tin probe payment khi admin hợp lệ", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());

    const verificationInfo = buildVerificationInfo();
    mockCreateUseCases.mockReturnValue({
      initiateCharityAccountVerification: {
        execute: jest.fn().mockResolvedValue(verificationInfo),
      },
    } as any);

    const response = await initiateVerify(makeRequest("POST"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.verification).toBeDefined();
    expect(body.verification.amount).toBe(CHARITY_ACCOUNT_VERIFICATION_AMOUNT);
    expect(body.verification.transactionCode).toContain("XACTHUC");
    expect(body.verification.qrImageUrl).toContain("vietqr.io");
  });

  it("trả về 403 nếu không phải Admin", async () => {
    mockAuth.mockResolvedValue(makeMenteeSession());

    const response = await initiateVerify(makeRequest("POST"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("trả về 403 nếu không có session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await initiateVerify(makeRequest("POST"), routeParams);
    expect(response.status).toBe(403);
  });

  it("trả về 400 nếu tài khoản không tồn tại", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    mockCreateUseCases.mockReturnValue({
      initiateCharityAccountVerification: {
        execute: jest.fn().mockRejectedValue(
          new Error("Không tìm thấy tài khoản thiện nguyện")
        ),
      },
    } as any);

    const response = await initiateVerify(makeRequest("POST"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Không tìm thấy");
  });

  it("trả về 400 nếu tài khoản đã xác thực rồi", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    mockCreateUseCases.mockReturnValue({
      initiateCharityAccountVerification: {
        execute: jest.fn().mockRejectedValue(
          new Error("Tài khoản này đã được xác thực thành công trước đó")
        ),
      },
    } as any);

    const response = await initiateVerify(makeRequest("POST"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("đã được xác thực");
  });

  it("sử dụng accountId từ URL params", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    const mockExecute = jest.fn().mockResolvedValue(buildVerificationInfo());
    mockCreateUseCases.mockReturnValue({
      initiateCharityAccountVerification: { execute: mockExecute },
    } as any);

    await initiateVerify(makeRequest("POST"), { params: { id: "charity_specific_001" } });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "charity_specific_001",
        adminId: "admin_001",
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/charity-accounts/[id]/verify
// ─────────────────────────────────────────────────────────────────────────────

describe("PATCH /api/admin/charity-accounts/[id]/verify – Confirm Verification", () => {
  afterEach(() => jest.clearAllMocks());

  it("trả về 200 khi xác thực thành công", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());

    const verifiedAccount = buildCharityAccount({
      verificationStatus: CharityAccountVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    });

    mockCreateUseCases.mockReturnValue({
      confirmCharityAccountVerification: {
        execute: jest.fn().mockResolvedValue({
          success: true,
          message: "✅ Xác thực tài khoản \"Quỹ Từ Thiện ABC\" thành công!",
          account: verifiedAccount,
        }),
      },
    } as any);

    const response = await confirmVerify(makeRequest("PATCH"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain("thành công");
    expect(body.account.verificationStatus).toBe(CharityAccountVerificationStatus.VERIFIED);
  });

  it("trả về 202 khi chưa tìm thấy giao dịch (thử lại sau)", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    mockCreateUseCases.mockReturnValue({
      confirmCharityAccountVerification: {
        execute: jest.fn().mockResolvedValue({
          success: false,
          message: "Chưa tìm thấy giao dịch xác thực. Vui lòng đợi vài phút và thử lại.",
        }),
      },
    } as any);

    const response = await confirmVerify(makeRequest("PATCH"), routeParams);
    const body = await response.json();

    // 202 Accepted = "chưa xong nhưng không lỗi, thử lại sau"
    expect(response.status).toBe(202);
    expect(body.success).toBe(false);
    expect(body.message).toContain("thử lại");
  });

  it("trả về 202 khi lỗi kết nối TN App", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    mockCreateUseCases.mockReturnValue({
      confirmCharityAccountVerification: {
        execute: jest.fn().mockResolvedValue({
          success: false,
          message: "Không thể kết nối TN App để xác minh. Vui lòng thử lại sau.",
        }),
      },
    } as any);

    const response = await confirmVerify(makeRequest("PATCH"), routeParams);

    expect(response.status).toBe(202);
  });

  it("trả về 403 nếu không phải Admin", async () => {
    mockAuth.mockResolvedValue(makeMenteeSession());

    const response = await confirmVerify(makeRequest("PATCH"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("trả về 403 nếu không có session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await confirmVerify(makeRequest("PATCH"), routeParams);
    expect(response.status).toBe(403);
  });

  it("trả về 400 nếu use case throw exception", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    mockCreateUseCases.mockReturnValue({
      confirmCharityAccountVerification: {
        execute: jest.fn().mockRejectedValue(
          new Error("Internal error")
        ),
      },
    } as any);

    const response = await confirmVerify(makeRequest("PATCH"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Internal error");
  });

  it("sử dụng accountId từ URL params và adminId từ session", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    const mockExecute = jest.fn().mockResolvedValue({
      success: true,
      message: "✅ Xác thực thành công",
      account: buildCharityAccount({ verificationStatus: CharityAccountVerificationStatus.VERIFIED }),
    });
    mockCreateUseCases.mockReturnValue({
      confirmCharityAccountVerification: { execute: mockExecute },
    } as any);

    await confirmVerify(makeRequest("PATCH"), { params: { id: "charity_target_001" } });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "charity_target_001",
        adminId: "admin_001",
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E API flow: POST initiate → PATCH confirm
// ─────────────────────────────────────────────────────────────────────────────

describe("API E2E: Initiate → Confirm Verification Flow", () => {
  afterEach(() => jest.clearAllMocks());

  it("luồng API hoàn chỉnh: POST initiate → PATCH confirm thành công", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());

    // Step 1: POST để khởi tạo
    const verificationInfo = buildVerificationInfo();
    mockCreateUseCases.mockReturnValueOnce({
      initiateCharityAccountVerification: {
        execute: jest.fn().mockResolvedValue(verificationInfo),
      },
    } as any);

    const initResponse = await initiateVerify(makeRequest("POST"), routeParams);
    const initBody = await initResponse.json();

    expect(initResponse.status).toBe(200);
    expect(initBody.verification.amount).toBe(1000);

    // Step 2: PATCH để xác nhận
    const verifiedAccount = buildCharityAccount({
      verificationStatus: CharityAccountVerificationStatus.VERIFIED,
    });

    mockCreateUseCases.mockReturnValueOnce({
      confirmCharityAccountVerification: {
        execute: jest.fn().mockResolvedValue({
          success: true,
          message: "✅ Xác thực tài khoản \"Quỹ Từ Thiện ABC\" thành công!",
          account: verifiedAccount,
        }),
      },
    } as any);

    const confirmResponse = await confirmVerify(makeRequest("PATCH"), routeParams);
    const confirmBody = await confirmResponse.json();

    expect(confirmResponse.status).toBe(200);
    expect(confirmBody.success).toBe(true);
    expect(confirmBody.account.verificationStatus).toBe(
      CharityAccountVerificationStatus.VERIFIED
    );
  });
});
