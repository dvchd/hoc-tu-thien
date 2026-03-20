import {
  InitiateActivationUseCase,
  VerifyPaymentUseCase,
  InitiateSessionFeePaymentUseCase,
} from "@/application/use-cases/payment/PaymentUseCases";
import {
  PaymentType,
  PaymentStatus,
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
    const payment = buildPaymentRecord({ type: PaymentType.ACTIVATION });

    const uow = createMockUnitOfWork();
    uow.users.findById.mockResolvedValue(user);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.payments.create.mockResolvedValue(payment);

    const result = await new InitiateActivationUseCase(uow).execute({
      userId: user.id,
    });

    expect(result.amount).toBe(ACTIVATION_AMOUNT);
    expect(result.transactionCode).toContain("HOCTUTHIEN KICHHOAT");
    expect(result.qrImageUrl).toContain("vietqr.io");
    expect(uow.payments.create).toHaveBeenCalledTimes(1);
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

  it("returns failure and marks payment FAILED when expired", async () => {
    const expiredPayment = buildPaymentRecord({
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() - 1000), // 1 sec ago
    });

    const uow = createMockUnitOfWork();
    uow.payments.findById.mockResolvedValue(expiredPayment);
    uow.payments.updateStatus.mockResolvedValue({
      ...expiredPayment,
      status: PaymentStatus.FAILED,
    } as any);

    const result = await new VerifyPaymentUseCase(uow).execute({
      paymentId: expiredPayment.id,
      triggeredBy: expiredPayment.userId,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("hết hạn");
    expect(uow.payments.updateStatus).toHaveBeenCalledWith(
      expiredPayment.id,
      PaymentStatus.FAILED
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
