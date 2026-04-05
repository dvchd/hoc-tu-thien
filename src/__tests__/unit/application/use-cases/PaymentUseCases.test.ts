import {
  InitiateActivationUseCase,
  VerifyPaymentUseCase,
  InitiateSessionFeePaymentUseCase,
} from "@/application/use-cases/payment/PaymentUseCases";
import {
  PaymentType,
  PaymentStatus,
  SessionStatus,
  ACTIVATION_AMOUNT,
} from "@/domain/value-objects/Payment";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import {
  buildUser,
  buildMentor,
  buildPaymentRecord,
  buildSessionRecord,
  createMockUnitOfWork,
} from "@/__tests__/helpers";
import { CharityAccountRecord } from "@/domain/repositories/ICharityAccountRepository";
import { CharityAccountVerificationStatus } from "@/domain/value-objects/Payment";

// ─── Helper: tạo default CharityAccountRecord ─────────────────────────────────
function buildDefaultCharityAccount(
  overrides: Partial<CharityAccountRecord> = {}
): CharityAccountRecord {
  return {
    id: "charity_default_001",
    name: "Quỹ Thiện Nguyện",
    accountNo: "2000",
    bankName: "MB Bank",
    campaignKeyword: null,
    description: null,
    isActive: true,
    isDefault: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "admin_001",
    isDeleted: false,
    deletedAt: null,
    verificationStatus: CharityAccountVerificationStatus.VERIFIED,
    verificationPaymentId: null,
    verificationShortCode: null,
    verifiedAt: new Date(),
    verifiedBy: "admin_001",
    verificationNote: null,
    ...overrides,
  };
}

// ─── Mock the TN App client ───────────────────────────────────────────────────

jest.mock("@/infrastructure/external/ThienNguyenAppClient", () => ({
  tnAppClient: {
    findTransactionByCode: jest.fn(),
  },
}));

import { tnAppClient } from "@/infrastructure/external/ThienNguyenAppClient";
const mockTnClient = tnAppClient as jest.Mocked<typeof tnAppClient>;

// ─── InitiateActivationUseCase ────────────────────────────────────────────────

describe("InitiateActivationUseCase", () => {
  it("creates a new activation payment for pending user", async () => {
    const user = buildUser({ status: UserStatus.PENDING_ACTIVATION });
    const defaultAccount = buildDefaultCharityAccount();
    const payment = buildPaymentRecord({
      type: PaymentType.ACTIVATION,
      tnAccountNo: defaultAccount.accountNo,
      tnAccountName: defaultAccount.name,
    });

    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(user);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.charityAccounts.findDefault.mockResolvedValue(defaultAccount);
    uow.payments.create.mockResolvedValue(payment);

    const result = await new InitiateActivationUseCase(uow).execute({
      userId: user.id,
    });

    expect(result.amount).toBe(ACTIVATION_AMOUNT);
    expect(result.transactionCode).toContain("HOCTUTHIEN KICHHOAT");
    expect(result.qrImageUrl).toContain("vietqr.io");
    // Tài khoản nhận lấy từ CharityAccount mặc định
    expect(result.tnAccountNo).toBe(defaultAccount.accountNo);
    expect(result.tnAccountName).toBe(defaultAccount.name);
    expect(uow.payments.create).toHaveBeenCalledTimes(1);
  });

  it("throws khi không có tài khoản thiện nguyện mặc định", async () => {
    const user = buildUser({ status: UserStatus.PENDING_ACTIVATION });
    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(user);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.charityAccounts.findDefault.mockResolvedValue(null); // Admin chưa cấu hình

    await expect(
      new InitiateActivationUseCase(uow).execute({ userId: user.id })
    ).rejects.toThrow("Chưa có tài khoản thiện nguyện mặc định");
  });

  it("throws if user already active", async () => {
    const activeUser = buildUser({ status: UserStatus.ACTIVE });
    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(activeUser);

    await expect(
      new InitiateActivationUseCase(uow).execute({ userId: activeUser.id })
    ).rejects.toThrow("Tài khoản đã được kích hoạt");
  });

  it("returns existing pending payment if not expired", async () => {
    const user = buildUser({ status: UserStatus.PENDING_ACTIVATION });
    const existing = buildPaymentRecord({
      type: PaymentType.ACTIVATION,
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 3600000), // 1h left
    });

    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(user);
    uow.payments.findPendingByUserId.mockResolvedValue([existing]);

    const result = await new InitiateActivationUseCase(uow).execute({
      userId: user.id,
    });

    expect(result.paymentId).toBe(existing.id);
    expect(uow.payments.create).not.toHaveBeenCalled();
  });

  it("shortCode contains only uppercase letters", async () => {
    const user = buildUser({ status: UserStatus.PENDING_ACTIVATION });
    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(user);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.charityAccounts.findDefault.mockResolvedValue(buildDefaultCharityAccount());

    let capturedInput: any;
    uow.payments.create.mockImplementation(async (input) => {
      capturedInput = input;
      return buildPaymentRecord({ ...input });
    });

    await new InitiateActivationUseCase(uow).execute({ userId: user.id });
    expect(capturedInput.shortCode).toMatch(/^[A-Z]+$/);
  });

  it("throws when user not found", async () => {
    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(null);

    await expect(
      new InitiateActivationUseCase(uow).execute({ userId: "ghost" })
    ).rejects.toThrow("Không tìm thấy người dùng");
  });
});

// ─── VerifyPaymentUseCase ─────────────────────────────────────────────────────

describe("VerifyPaymentUseCase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns success when TN App finds matching transaction", async () => {
    const payment = buildPaymentRecord({
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 3600000),
      type: PaymentType.ACTIVATION,
    });
    const verifiedPayment = { ...payment, status: PaymentStatus.VERIFIED };
    const user = buildUser({ id: payment.userId, status: UserStatus.PENDING_ACTIVATION });

    const uow = createMockUnitOfWork();
    uow.payments.findById.mockResolvedValue(payment);
    uow.payments.updateStatus.mockResolvedValue(verifiedPayment as any);
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);
    uow.users.findById.mockResolvedValue(user);
    uow.users.update.mockResolvedValue(user.activate("system"));

    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: true,
      transaction: {
        id: "tn_tx_001",
        refId: "FT12345",
        transactionTime: "2025-01-01T10:00:00",
        type: "CREDIT",
        transactionAmount: 10000,
        otherAccountDisplayName: "NGUYEN VAN A",
        otherAccountName: "NGUYEN VAN A",
        narrative: "HOCTUTHIEN KICHHOAT ABCDEF",
        incognito: false,
      },
      rawResponse: "{}",
    });

    const result = await new VerifyPaymentUseCase(uow).execute({
      paymentId: payment.id,
      triggeredBy: payment.userId,
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Kích hoạt tài khoản thành công");
  });

  it("returns failure when TN App does not find transaction", async () => {
    const payment = buildPaymentRecord({
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 3600000),
    });

    const uow = createMockUnitOfWork();
    uow.payments.findById.mockResolvedValue(payment);
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);

    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: false,
      transaction: null,
      rawResponse: "{}",
    });

    const result = await new VerifyPaymentUseCase(uow).execute({
      paymentId: payment.id,
      triggeredBy: payment.userId,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Chưa tìm thấy giao dịch");
    expect(uow.payments.updateStatus).not.toHaveBeenCalledWith(
      payment.id,
      PaymentStatus.VERIFIED,
      expect.anything()
    );
  });

  it("does NOT reject payment after expiresAt — mentee can pay anytime (BR32 soft deadline)", async () => {
    const expiredPayment = buildPaymentRecord({
      status: PaymentStatus.PENDING,
      type: PaymentType.SESSION_FEE, // Session fee — not activation
      sessionId: "sess_late_pay",
      expiresAt: new Date(Date.now() - 86400000), // 1 day ago — soft deadline passed
    });

    const uow = createMockUnitOfWork();
    uow.payments.findById.mockResolvedValue(expiredPayment);
    uow.payments.updateStatus.mockResolvedValue({
      ...expiredPayment,
      status: PaymentStatus.VERIFIED,
    } as any);
    // Mock session for SESSION_FEE payment verification
    uow.sessions.findById.mockResolvedValue({
      id: "sess_late_pay",
      status: SessionStatus.PAYMENT_PENDING,
      isNoShow: false,
      mentorId: "mentor_001",
    } as any);
    uow.mentorProfiles.incrementTotalSessions.mockResolvedValue();
    // TN App finds the transaction (mentee did pay, just late)
    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: true,
      transaction: { id: "tx123", refId: "ref123", transactionAmount: expiredPayment.amount },
    });

    const result = await new VerifyPaymentUseCase(uow).execute({
      paymentId: expiredPayment.id,
      triggeredBy: expiredPayment.userId,
    });

    // Payment should be verified even after deadline
    // (expiresAt is soft deadline only — BR32 says mentee just can't book NEW sessions)
    expect(result.success).toBe(true);
    expect(result.message).toContain("thành công");
    expect(uow.payments.updateStatus).toHaveBeenCalledWith(
      expiredPayment.id,
      PaymentStatus.VERIFIED,
      expect.any(Object)
    );
  });

  it("returns success immediately for already-verified payment", async () => {
    const verified = buildPaymentRecord({ status: PaymentStatus.VERIFIED });

    const uow = createMockUnitOfWork();
    uow.payments.findById.mockResolvedValue(verified);

    const result = await new VerifyPaymentUseCase(uow).execute({
      paymentId: verified.id,
      triggeredBy: verified.userId,
    });

    expect(result.success).toBe(true);
    expect(mockTnClient.findTransactionByCode).not.toHaveBeenCalled();
  });

  it("returns error when payment not found", async () => {
    const uow = createMockUnitOfWork();
    uow.payments.findById.mockResolvedValue(null);

    const result = await new VerifyPaymentUseCase(uow).execute({
      paymentId: "ghost",
      triggeredBy: "user",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Không tìm thấy");
  });

  it("logs every verification attempt", async () => {
    const payment = buildPaymentRecord({
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 3600000),
    });

    const uow = createMockUnitOfWork();
    uow.payments.findById.mockResolvedValue(payment);
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);

    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: false,
      transaction: null,
    });

    await new VerifyPaymentUseCase(uow).execute({
      paymentId: payment.id,
      triggeredBy: "user",
    });

    expect(uow.payments.logVerification).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: payment.id })
    );
    expect(uow.payments.incrementCheckCount).toHaveBeenCalled();
  });
});
