import {
  InitiateSessionFeePaymentUseCase,
  VerifyPaymentUseCase,
  buildPaymentInfoResponse,
} from "@/application/use-cases/payment/PaymentUseCases";
import { ITransactionVerificationService } from "@/application/use-cases/payment/PaymentUseCases";
import { createMockUnitOfWork, buildMentee, buildMentor, buildPaymentRecord, buildSessionRecord } from "@/__tests__/helpers";
import { PaymentType, PaymentStatus, SessionStatus } from "@/domain/value-objects/Payment";

// ─── InitiateSessionFeePaymentUseCase ─────────────────────────────────────────

describe("InitiateSessionFeePaymentUseCase", () => {
  let useCase: InitiateSessionFeePaymentUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
    useCase = new InitiateSessionFeePaymentUseCase(uow);
  });

  it("should throw error if session not found", async () => {
    uow.sessions.findById.mockResolvedValue(null);

    await expect(useCase.execute("sess_001", "mentee_001"))
      .rejects.toThrow("Không tìm thấy buổi học");
  });

  it("should throw error if user is not the mentee", async () => {
    uow.sessions.findById.mockResolvedValue(
      buildSessionRecord({ menteeId: "other_mentee" })
    );

    await expect(useCase.execute("sess_001", "mentee_001"))
      .rejects.toThrow("Không có quyền truy cập");
  });

  it("should throw error if session is free", async () => {
    uow.sessions.findById.mockResolvedValue(
      buildSessionRecord({ menteeId: "mentee_001", fee: 0 })
    );

    await expect(useCase.execute("sess_001", "mentee_001"))
      .rejects.toThrow("Buổi học miễn phí");
  });

  it("should throw error if session is not PAYMENT_PENDING", async () => {
    uow.sessions.findById.mockResolvedValue(
      buildSessionRecord({ menteeId: "mentee_001", fee: 50000, status: SessionStatus.PENDING })
    );

    await expect(useCase.execute("sess_001", "mentee_001"))
      .rejects.toThrow("không trong trạng thái chờ thanh toán");
  });

  it("should reuse existing valid pending payment", async () => {
    const session = buildSessionRecord({
      menteeId: "mentee_001",
      fee: 50000,
      status: SessionStatus.PAYMENT_PENDING,
      mentorId: "mentor_001",
    });
    uow.sessions.findById.mockResolvedValue(session);

    const existingPayment = buildPaymentRecord({
      sessionId: "sess_001",
      type: PaymentType.SESSION_FEE,
      status: PaymentStatus.PENDING,
      amount: 50000,
      expiresAt: new Date(Date.now() + 86400000),
    });
    uow.payments.findPendingByUserId.mockResolvedValue([existingPayment]);

    const result = await useCase.execute("sess_001", "mentee_001");

    expect(result.paymentId).toBe("pay_001");
    expect(result.amount).toBe(50000);
    expect(uow.payments.create).not.toHaveBeenCalled();
  });

  it("should create new payment with charity account (Priority 1)", async () => {
    const session = buildSessionRecord({
      menteeId: "mentee_001",
      fee: 50000,
      status: SessionStatus.PAYMENT_PENDING,
      mentorId: "mentor_001",
    });
    uow.sessions.findById.mockResolvedValue(session);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 50000,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: "charity_001",
      onlyActivatedMentee: false,
    });
    uow.charityAccounts.findById.mockResolvedValue({
      id: "charity_001",
      accountNo: "3000",
      name: "Mentor Charity",
      isActive: true,
    } as any);
    uow.payments.create.mockResolvedValue(
      buildPaymentRecord({
        tnAccountNo: "3000",
        tnAccountName: "Mentor Charity",
        amount: 50000,
      })
    );
    uow.systemConfig.getNumber.mockResolvedValue(24);

    const result = await useCase.execute("sess_001", "mentee_001");

    expect(result.tnAccountNo).toBe("3000");
    expect(result.tnAccountName).toBe("Mentor Charity");
    expect(uow.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PaymentType.SESSION_FEE,
        amount: 50000,
        tnAccountNo: "3000",
      })
    );
  });

  it("should fallback to legacy tnAccountNo (Priority 2)", async () => {
    const session = buildSessionRecord({
      menteeId: "mentee_001",
      fee: 50000,
      status: SessionStatus.PAYMENT_PENDING,
      mentorId: "mentor_001",
    });
    uow.sessions.findById.mockResolvedValue(session);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 50000,
      tnAccountNo: "4000",
      tnAccountName: "Legacy Account",
      tnCampaignKeyword: null,
      charityAccountId: null,
      onlyActivatedMentee: false,
    });
    uow.charityAccounts.findById.mockResolvedValue(null);
    uow.charityAccounts.findDefault.mockResolvedValue(null);
    uow.payments.create.mockResolvedValue(
      buildPaymentRecord({ tnAccountNo: "4000", tnAccountName: "Legacy Account", amount: 50000 })
    );
    uow.systemConfig.getNumber.mockResolvedValue(24);

    const result = await useCase.execute("sess_001", "mentee_001");
    expect(result.tnAccountNo).toBe("4000");
  });

  it("should fallback to default charity account (Priority 3)", async () => {
    const session = buildSessionRecord({
      menteeId: "mentee_001",
      fee: 50000,
      status: SessionStatus.PAYMENT_PENDING,
      mentorId: "mentor_001",
    });
    uow.sessions.findById.mockResolvedValue(session);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 50000,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: null,
      onlyActivatedMentee: false,
    });
    uow.charityAccounts.findById.mockResolvedValue(null);
    uow.charityAccounts.findDefault.mockResolvedValue({
      accountNo: "9999",
      name: "System Default",
    } as any);
    uow.payments.create.mockResolvedValue(
      buildPaymentRecord({ tnAccountNo: "9999", tnAccountName: "System Default", amount: 50000 })
    );
    uow.systemConfig.getNumber.mockResolvedValue(24);

    const result = await useCase.execute("sess_001", "mentee_001");
    expect(result.tnAccountNo).toBe("9999");
    expect(result.tnAccountName).toBe("System Default");
  });

  it("should throw error when no account available at all", async () => {
    const session = buildSessionRecord({
      menteeId: "mentee_001",
      fee: 50000,
      status: SessionStatus.PAYMENT_PENDING,
      mentorId: "mentor_001",
    });
    uow.sessions.findById.mockResolvedValue(session);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 50000,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: null,
      onlyActivatedMentee: false,
    });
    uow.charityAccounts.findById.mockResolvedValue(null);
    uow.charityAccounts.findDefault.mockResolvedValue(null);

    await expect(useCase.execute("sess_001", "mentee_001"))
      .rejects.toThrow("Mentor chưa cấu hình tài khoản nhận học phí");
  });

  it("should skip inactive charity account and fallback", async () => {
    const session = buildSessionRecord({
      menteeId: "mentee_001",
      fee: 50000,
      status: SessionStatus.PAYMENT_PENDING,
      mentorId: "mentor_001",
    });
    uow.sessions.findById.mockResolvedValue(session);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 50000,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: "charity_inactive",
      onlyActivatedMentee: false,
    });
    uow.charityAccounts.findById.mockResolvedValue({
      id: "charity_inactive",
      isActive: false,
    } as any);
    uow.charityAccounts.findDefault.mockResolvedValue({
      accountNo: "DEFAULT",
      name: "Default",
    } as any);
    uow.payments.create.mockResolvedValue(
      buildPaymentRecord({ tnAccountNo: "DEFAULT", tnAccountName: "Default", amount: 50000 })
    );
    uow.systemConfig.getNumber.mockResolvedValue(24);

    const result = await useCase.execute("sess_001", "mentee_001");
    expect(result.tnAccountNo).toBe("DEFAULT");
  });

  it("should throw error for NaN expiry hours", async () => {
    const session = buildSessionRecord({
      menteeId: "mentee_001",
      fee: 50000,
      status: SessionStatus.PAYMENT_PENDING,
      mentorId: "mentor_001",
    });
    uow.sessions.findById.mockResolvedValue(session);
    uow.payments.findPendingByUserId.mockResolvedValue([]);
    uow.sessions.getMentorProfileFee.mockResolvedValue({
      hourlyRate: 50000,
      tnAccountNo: null,
      tnAccountName: null,
      tnCampaignKeyword: null,
      charityAccountId: null,
      onlyActivatedMentee: false,
    });
    uow.charityAccounts.findById.mockResolvedValue(null);
    uow.charityAccounts.findDefault.mockResolvedValue({
      accountNo: "9999",
      name: "Default",
    } as any);
    uow.systemConfig.getNumber.mockResolvedValue(NaN);

    await expect(useCase.execute("sess_001", "mentee_001"))
      .rejects.toThrow("PAYMENT_EXPIRY_HOURS không hợp lệ");
  });
});

// ─── VerifyPaymentUseCase — SESSION_FEE branch ─────────────────────────────────

describe("VerifyPaymentUseCase - Session Fee Verification", () => {
  let useCase: VerifyPaymentUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;
  let mockVerificationService: jest.Mocked<ITransactionVerificationService>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
    mockVerificationService = {
      findTransactionByCode: jest.fn(),
    };
    useCase = new VerifyPaymentUseCase(uow, mockVerificationService);
  });

  it("should complete session after session fee payment verification", async () => {
    const payment = buildPaymentRecord({
      type: PaymentType.SESSION_FEE,
      sessionId: "sess_001",
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 86400000),
    });
    uow.payments.findById.mockResolvedValue(payment);

    const session = buildSessionRecord({
      id: "sess_001",
      mentorId: "mentor_001",
      status: SessionStatus.PAYMENT_PENDING,
      fee: 50000,
    });
    uow.sessions.findById.mockResolvedValue(session);

    const updatedSession = buildSessionRecord({
      id: "sess_001",
      status: SessionStatus.COMPLETED,
      fee: 50000,
    });
    uow.sessions.updateStatus.mockResolvedValue(updatedSession);

    const verifiedPayment = buildPaymentRecord({ status: PaymentStatus.VERIFIED });
    uow.payments.updateStatus.mockResolvedValue(verifiedPayment);

    mockVerificationService.findTransactionByCode.mockResolvedValue({
      found: true,
      transaction: { id: "tx_001", refId: "ref_001", transactionAmount: 50000 },
      rawResponse: "{}",
    });

    const result = await useCase.execute({ paymentId: "pay_001", triggeredBy: "mentee_001" });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Thanh toán học phí thành công");

    // Should transition session from PAYMENT_PENDING to COMPLETED
    expect(uow.sessions.updateStatus).toHaveBeenCalledWith(
      "sess_001",
      SessionStatus.COMPLETED
    );

    // Should increment mentor total sessions
    expect(uow.mentorProfiles.incrementTotalSessions).toHaveBeenCalledWith("mentor_001");
  });

  it("should not increment mentor sessions if session status is not PAYMENT_PENDING", async () => {
    const payment = buildPaymentRecord({
      type: PaymentType.SESSION_FEE,
      sessionId: "sess_001",
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 86400000),
    });
    uow.payments.findById.mockResolvedValue(payment);

    // Session already completed somehow
    const session = buildSessionRecord({
      id: "sess_001",
      mentorId: "mentor_001",
      status: SessionStatus.COMPLETED,
      fee: 50000,
    });
    uow.sessions.findById.mockResolvedValue(session);

    const verifiedPayment = buildPaymentRecord({ status: PaymentStatus.VERIFIED });
    uow.payments.updateStatus.mockResolvedValue(verifiedPayment);

    mockVerificationService.findTransactionByCode.mockResolvedValue({
      found: true,
      transaction: { id: "tx_001", refId: "ref_001", transactionAmount: 50000 },
      rawResponse: "{}",
    });

    await useCase.execute({ paymentId: "pay_001", triggeredBy: "mentee_001" });

    // Should NOT update session status again
    expect(uow.sessions.updateStatus).not.toHaveBeenCalled();
    // Should NOT increment mentor sessions
    expect(uow.mentorProfiles.incrementTotalSessions).not.toHaveBeenCalled();
  });

  it("does NOT block verification after expiresAt (BR32 soft deadline)", async () => {
    const payment = buildPaymentRecord({
      type: PaymentType.SESSION_FEE,
      status: PaymentStatus.PENDING,
      sessionId: "sess_001",
      expiresAt: new Date(Date.now() - 86400000), // Expired 1 day ago — but payment still works
    });
    uow.payments.findById.mockResolvedValue(payment);
    uow.payments.updateStatus.mockResolvedValue({ ...payment, status: PaymentStatus.VERIFIED });
    uow.sessions.findById.mockResolvedValue({
      id: "sess_001",
      status: SessionStatus.PAYMENT_PENDING,
      isNoShow: false,
      mentorId: "mentor_001",
    } as any);
    uow.mentorProfiles.incrementTotalSessions.mockResolvedValue();
    mockVerificationService.findTransactionByCode.mockResolvedValue({
      found: true,
      transaction: { id: "tx1", refId: "ref1", transactionAmount: payment.amount },
    });

    const result = await useCase.execute({ paymentId: "pay_001", triggeredBy: "mentee_001" });

    // BR32: Payment has NO hard expiry. expiresAt is informational only.
    expect(result.success).toBe(true);
  });

  it("should log verification on failure", async () => {
    const payment = buildPaymentRecord({
      type: PaymentType.SESSION_FEE,
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 86400000),
    });
    uow.payments.findById.mockResolvedValue(payment);
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);

    mockVerificationService.findTransactionByCode.mockResolvedValue({
      found: false,
      transaction: null,
      rawResponse: "{}",
    });

    const result = await useCase.execute({ paymentId: "pay_001", triggeredBy: "mentee_001" });

    expect(result.success).toBe(false);
    expect(uow.payments.logVerification).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pay_001", found: false })
    );
    expect(uow.payments.incrementCheckCount).toHaveBeenCalled();
  });

  it("should handle connection error gracefully", async () => {
    const payment = buildPaymentRecord({
      type: PaymentType.SESSION_FEE,
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 86400000),
    });
    uow.payments.findById.mockResolvedValue(payment);
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);

    mockVerificationService.findTransactionByCode.mockResolvedValue({
      found: false,
      transaction: null,
      rawResponse: "",
      error: "Network timeout",
    });

    const result = await useCase.execute({ paymentId: "pay_001", triggeredBy: "mentee_001" });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Không thể kết nối TN App");
  });
});

// ─── buildPaymentInfoResponse utility ──────────────────────────────────────────

describe("buildPaymentInfoResponse", () => {
  it("should build payment info from payment record", () => {
    const payment = buildPaymentRecord({
      id: "pay_001",
      transactionCode: "HOCTUTHIEN HOCPHI ABCDEF",
      shortCode: "ABCDEF",
      amount: 50000,
      tnAccountNo: "2000",
      tnAccountName: "Quy Thien Nguyen",
      expiresAt: new Date("2025-12-31T00:00:00Z"),
    });

    const result = buildPaymentInfoResponse(payment);

    expect(result).toEqual({
      paymentId: "pay_001",
      transactionCode: "HOCTUTHIEN HOCPHI ABCDEF",
      shortCode: "ABCDEF",
      amount: 50000,
      tnAccountNo: "2000",
      tnAccountName: "Quy Thien Nguyen",
      qrImageUrl: expect.stringContaining("https://img.vietqr.io"),
      expiresAt: "2025-12-31T00:00:00.000Z",
    });
  });

  it("should handle null tnAccountName", () => {
    const payment = buildPaymentRecord({
      tnAccountName: null,
    });

    const result = buildPaymentInfoResponse(payment);
    expect(result.tnAccountName).toBe("");
  });
});
