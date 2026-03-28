/**
 * Unit Tests – Charity Account Verification Use Cases
 *
 * Kiểm tra toàn bộ luồng xác thực tài khoản thiện nguyện:
 * Admin tạo probe payment 1,000 VND → poll TN App → cập nhật verificationStatus
 *
 * Tests bao gồm:
 * - InitiateCharityAccountVerificationUseCase (tạo probe payment)
 * - ConfirmCharityAccountVerificationUseCase (xác nhận giao dịch qua TN App)
 * - Payment.ts: PaymentType mới, buildTransactionContent, parseTransactionContent
 */

import {
  InitiateCharityAccountVerificationUseCase,
  ConfirmCharityAccountVerificationUseCase,
} from "@/application/use-cases/admin/CharityAccountUseCases";
import {
  PaymentType,
  PaymentStatus,
  CharityAccountVerificationStatus,
  CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
  buildTransactionContent,
  parseTransactionContent,
} from "@/domain/value-objects/Payment";
import { SYSTEM_CONFIG_KEYS } from "@/domain/repositories/ISystemConfigRepository";
import { buildPaymentRecord, createMockUnitOfWork } from "@/__tests__/helpers";
import { CharityAccountRecord } from "@/domain/repositories/ICharityAccountRepository";

// ─── Helper: mock systemConfig.getNumber theo key ────────────────────────────
// Trả về amount (configurable) cho CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
// và expiryHours cho PAYMENT_EXPIRY_HOURS.
function mockConfigGetNumber(
  uow: ReturnType<typeof createMockUnitOfWork>,
  verificationAmount = CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
  expiryHours = 24
) {
  uow.systemConfig.getNumber.mockImplementation(
    async (key: string, fallback: number) => {
      if (key === SYSTEM_CONFIG_KEYS.CHARITY_ACCOUNT_VERIFICATION_AMOUNT) {
        return verificationAmount;
      }
      if (key === SYSTEM_CONFIG_KEYS.PAYMENT_EXPIRY_HOURS) {
        return expiryHours;
      }
      return fallback;
    }
  );
}

// ─── Mock external TN App client ─────────────────────────────────────────────

jest.mock("@/infrastructure/external/ThienNguyenAppClient", () => ({
  tnAppClient: { findTransactionByCode: jest.fn() },
}));

import { tnAppClient } from "@/infrastructure/external/ThienNguyenAppClient";
const mockTnClient = tnAppClient as jest.Mocked<typeof tnAppClient>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCharityAccountRecord(
  overrides: Partial<CharityAccountRecord> = {}
): CharityAccountRecord {
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
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
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
// 1. Payment value-object: kiểm tra CHARITY_ACCOUNT_VERIFICATION type
// ─────────────────────────────────────────────────────────────────────────────

describe("Payment value-object – CHARITY_ACCOUNT_VERIFICATION", () => {
  it("PaymentType enum includes CHARITY_ACCOUNT_VERIFICATION", () => {
    expect(PaymentType.CHARITY_ACCOUNT_VERIFICATION).toBe("CHARITY_ACCOUNT_VERIFICATION");
  });

  it("CHARITY_ACCOUNT_VERIFICATION_AMOUNT là 1,000 VND", () => {
    expect(CHARITY_ACCOUNT_VERIFICATION_AMOUNT).toBe(1000);
  });

  it("buildTransactionContent tạo đúng nội dung cho CHARITY_ACCOUNT_VERIFICATION", () => {
    const content = buildTransactionContent(
      PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      "ABCDEFGH"
    );
    expect(content).toBe("HOCTUTHIEN XACTHUC ABCDEFGH");
  });

  it("buildTransactionContent vẫn đúng cho ACTIVATION và SESSION_FEE", () => {
    expect(buildTransactionContent(PaymentType.ACTIVATION, "TESTCODE")).toBe(
      "HOCTUTHIEN KICHHOAT TESTCODE"
    );
    expect(buildTransactionContent(PaymentType.SESSION_FEE, "TESTCODE")).toBe(
      "HOCTUTHIEN HOCPHI TESTCODE"
    );
  });

  it("parseTransactionContent parse đúng XACTHUC", () => {
    const result = parseTransactionContent("HOCTUTHIEN XACTHUC ABCDEFGH");
    expect(result.isHocTuThien).toBe(true);
    expect(result.type).toBe(PaymentType.CHARITY_ACCOUNT_VERIFICATION);
    expect(result.shortCode).toBe("ABCDEFGH");
  });

  it("parseTransactionContent không nhận XACTHUC khi không có shortCode", () => {
    const result = parseTransactionContent("HOCTUTHIEN XACTHUC");
    expect(result.type).toBeNull();
  });

  it("parseTransactionContent case-insensitive", () => {
    const result = parseTransactionContent("hoctuthien xacthuc abcdefgh");
    expect(result.type).toBe(PaymentType.CHARITY_ACCOUNT_VERIFICATION);
    expect(result.shortCode).toBe("ABCDEFGH");
  });

  it("parseTransactionContent vẫn phân biệt đúng các loại khác", () => {
    const act = parseTransactionContent("HOCTUTHIEN KICHHOAT XYZABCDE");
    expect(act.type).toBe(PaymentType.ACTIVATION);

    const fee = parseTransactionContent("HOCTUTHIEN HOCPHI MNPQRSTU");
    expect(fee.type).toBe(PaymentType.SESSION_FEE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. InitiateCharityAccountVerificationUseCase
// ─────────────────────────────────────────────────────────────────────────────

describe("InitiateCharityAccountVerificationUseCase", () => {
  afterEach(() => jest.clearAllMocks());

  it("tạo probe payment 1,000 VND và cập nhật verificationStatus = PENDING", async () => {
    const uow = createMockUnitOfWork();
    const account = buildCharityAccountRecord({
      id: "charity_init_001",
      verificationStatus: CharityAccountVerificationStatus.UNVERIFIED,
    });

    const probePayment = buildPaymentRecord({
      id: "probe_pay_001",
      userId: "admin_001",
      type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      amount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
      shortCode: "XACTHUC1",
      transactionCode: "HOCTUTHIEN XACTHUC XACTHUC1",
      tnAccountNo: account.accountNo,
      tnAccountName: account.name,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const pendingAccount = {
      ...account,
      verificationStatus: CharityAccountVerificationStatus.PENDING,
      verificationPaymentId: probePayment.id,
      verificationShortCode: "XACTHUC1",
    };

    uow.charityAccounts.findById.mockResolvedValue(account);
    mockConfigGetNumber(uow); // default: 1000 VND, 24h expiry
    uow.payments.create.mockResolvedValue(probePayment);
    uow.charityAccounts.updateVerificationStatus.mockResolvedValue(pendingAccount);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const useCase = new InitiateCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_init_001",
      adminId: "admin_001",
    });

    // Trả về thông tin probe payment với amount từ SystemConfig
    expect(result.amount).toBe(CHARITY_ACCOUNT_VERIFICATION_AMOUNT);
    expect(result.transactionCode).toContain("XACTHUC");
    expect(result.tnAccountNo).toBe(account.accountNo);
    expect(result.tnAccountName).toBe(account.name);
    expect(result.qrImageUrl).toContain("vietqr.io");
    expect(result.accountNo).toBe(account.accountNo);

    // Đã tạo payment
    expect(uow.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
        amount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
        tnAccountNo: account.accountNo,
        userId: "admin_001",
      })
    );

    // Đã cập nhật status = PENDING
    expect(uow.charityAccounts.updateVerificationStatus).toHaveBeenCalledWith(
      "charity_init_001",
      CharityAccountVerificationStatus.PENDING,
      expect.objectContaining({
        verificationPaymentId: probePayment.id,
        verifiedBy: "admin_001",
      })
    );

    // Đã ghi audit log
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHARITY_ACCOUNT_VERIFICATION_INITIATED" })
    );
  });

  it("tái sử dụng payment PENDING cũ nếu chưa hết hạn", async () => {
    const uow = createMockUnitOfWork();
    const existingPayment = buildPaymentRecord({
      id: "probe_existing",
      type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      amount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
      tnAccountNo: "1234567890",
      tnAccountName: "Quỹ ABC",
      expiresAt: new Date(Date.now() + 3600000), // còn 1 tiếng
      status: PaymentStatus.PENDING,
    });

    const account = buildCharityAccountRecord({
      verificationStatus: CharityAccountVerificationStatus.PENDING,
      verificationPaymentId: existingPayment.id,
    });

    uow.charityAccounts.findById.mockResolvedValue(account);
    uow.payments.findById.mockResolvedValue(existingPayment);

    const useCase = new InitiateCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    // Không tạo payment mới
    expect(uow.payments.create).not.toHaveBeenCalled();
    // Trả về thông tin payment cũ
    expect(result.paymentId).toBe(existingPayment.id);
    expect(result.amount).toBe(CHARITY_ACCOUNT_VERIFICATION_AMOUNT);
  });

  it("tạo payment mới khi payment cũ đã hết hạn", async () => {
    const uow = createMockUnitOfWork();
    const expiredPayment = buildPaymentRecord({
      id: "probe_expired",
      type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      amount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
      expiresAt: new Date(Date.now() - 3600000), // hết hạn 1 tiếng trước
      status: PaymentStatus.PENDING,
    });

    const account = buildCharityAccountRecord({
      verificationStatus: CharityAccountVerificationStatus.PENDING,
      verificationPaymentId: expiredPayment.id,
    });

    const newPayment = buildPaymentRecord({
      id: "probe_new_001",
      type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      amount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const pendingAccount = {
      ...account,
      verificationPaymentId: newPayment.id,
    };

    uow.charityAccounts.findById.mockResolvedValue(account);
    uow.payments.findById.mockResolvedValue(expiredPayment);
    mockConfigGetNumber(uow);
    uow.payments.create.mockResolvedValue(newPayment);
    uow.charityAccounts.updateVerificationStatus.mockResolvedValue(pendingAccount);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const useCase = new InitiateCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    // Tạo payment mới
    expect(uow.payments.create).toHaveBeenCalledTimes(1);
    expect(result.paymentId).toBe(newPayment.id);
  });

  it("amount được đọc từ SystemConfig khi admin cấu hình giá trị khác", async () => {
    const uow = createMockUnitOfWork();
    const account = buildCharityAccountRecord({
      verificationStatus: CharityAccountVerificationStatus.UNVERIFIED,
    });

    const customAmount = 2000; // admin cấu hình 2,000 VND thay vì 1,000 VND mặc định

    mockConfigGetNumber(uow, customAmount, 48); // 2000 VND, hết hạn sau 48h

    uow.charityAccounts.findById.mockResolvedValue(account);
    uow.payments.create.mockImplementation(async (input) =>
      buildPaymentRecord({
        id: "probe_custom",
        ...input,
        status: PaymentStatus.PENDING,
      })
    );
    uow.charityAccounts.updateVerificationStatus.mockResolvedValue(account);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const useCase = new InitiateCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    // Amount phải là 2000 (từ config), không phải 1000 (constant)
    expect(result.amount).toBe(customAmount);
    expect(uow.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: customAmount })
    );
    // SystemConfig được gọi với đúng key
    expect(uow.systemConfig.getNumber).toHaveBeenCalledWith(
      SYSTEM_CONFIG_KEYS.CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
      CHARITY_ACCOUNT_VERIFICATION_AMOUNT
    );
    expect(uow.systemConfig.getNumber).toHaveBeenCalledWith(
      SYSTEM_CONFIG_KEYS.PAYMENT_EXPIRY_HOURS,
      expect.any(Number)
    );
  });

  it("throw khi tài khoản không tồn tại", async () => {
    const uow = createMockUnitOfWork();
    uow.charityAccounts.findById.mockResolvedValue(null);

    const useCase = new InitiateCharityAccountVerificationUseCase(uow);
    await expect(
      useCase.execute({ accountId: "nonexistent", adminId: "admin_001" })
    ).rejects.toThrow("Không tìm thấy tài khoản thiện nguyện");
  });

  it("throw khi tài khoản đã bị xóa", async () => {
    const uow = createMockUnitOfWork();
    uow.charityAccounts.findById.mockResolvedValue(
      buildCharityAccountRecord({ isDeleted: true })
    );

    const useCase = new InitiateCharityAccountVerificationUseCase(uow);
    await expect(
      useCase.execute({ accountId: "charity_001", adminId: "admin_001" })
    ).rejects.toThrow("đã bị xóa");
  });

  it("throw khi tài khoản đã xác thực thành công rồi", async () => {
    const uow = createMockUnitOfWork();
    uow.charityAccounts.findById.mockResolvedValue(
      buildCharityAccountRecord({
        verificationStatus: CharityAccountVerificationStatus.VERIFIED,
      })
    );

    const useCase = new InitiateCharityAccountVerificationUseCase(uow);
    await expect(
      useCase.execute({ accountId: "charity_001", adminId: "admin_001" })
    ).rejects.toThrow("đã được xác thực thành công");
  });

  it("nội dung chuyển khoản chứa prefix XACTHUC", async () => {
    const uow = createMockUnitOfWork();
    const account = buildCharityAccountRecord();

    uow.charityAccounts.findById.mockResolvedValue(account);
    mockConfigGetNumber(uow);
    uow.payments.create.mockImplementation(async (input) =>
      buildPaymentRecord({
        id: "probe_001",
        ...input,
        status: PaymentStatus.PENDING,
      })
    );
    uow.charityAccounts.updateVerificationStatus.mockResolvedValue(account);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const useCase = new InitiateCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    expect(result.transactionCode).toMatch(/^HOCTUTHIEN XACTHUC [A-Z]+$/);
    expect(result.shortCode).toMatch(/^[A-Z]{8}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ConfirmCharityAccountVerificationUseCase
// ─────────────────────────────────────────────────────────────────────────────

describe("ConfirmCharityAccountVerificationUseCase", () => {
  afterEach(() => jest.clearAllMocks());

  it("xác thực thành công khi TN App tìm thấy giao dịch", async () => {
    const uow = createMockUnitOfWork();
    const probePayment = buildPaymentRecord({
      id: "probe_confirm_001",
      type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      amount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
      shortCode: "PROBEXYZ1",
      tnAccountNo: "1234567890",
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 3600000),
    });

    const pendingAccount = buildCharityAccountRecord({
      verificationStatus: CharityAccountVerificationStatus.PENDING,
      verificationPaymentId: probePayment.id,
      verificationShortCode: "PROBEXYZ1",
    });

    const verifiedAccount = {
      ...pendingAccount,
      verificationStatus: CharityAccountVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
      verifiedBy: "admin_001",
      verificationNote: "Xác thực thành công qua TN App. TxId: tn_probe_001",
    };

    uow.charityAccounts.findById.mockResolvedValue(pendingAccount);
    uow.payments.findById.mockResolvedValue(probePayment);
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);
    uow.payments.updateStatus.mockResolvedValue({
      ...probePayment,
      status: PaymentStatus.VERIFIED,
    } as any);
    uow.charityAccounts.updateVerificationStatus.mockResolvedValue(verifiedAccount);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: true,
      transaction: {
        id: "tn_probe_001",
        refId: "FT_PROBE_001",
        transactionTime: "2025-06-01T10:00:00",
        type: "CREDIT",
        transactionAmount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
        otherAccountDisplayName: "ADMIN",
        otherAccountName: "ADMIN",
        narrative: "HOCTUTHIEN XACTHUC PROBEXYZ1",
        incognito: false,
      },
      rawResponse: "{}",
    });

    const useCase = new ConfirmCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Xác thực tài khoản");
    expect(result.message).toContain("thành công");
    expect(result.account).toBeDefined();
    expect(result.account!.verificationStatus).toBe(CharityAccountVerificationStatus.VERIFIED);

    // Verify các side-effects
    expect(uow.payments.logVerification).toHaveBeenCalledWith(
      expect.objectContaining({ found: true })
    );
    expect(uow.payments.updateStatus).toHaveBeenCalledWith(
      probePayment.id,
      PaymentStatus.VERIFIED,
      expect.objectContaining({ tnTransactionId: "tn_probe_001" })
    );
    expect(uow.charityAccounts.updateVerificationStatus).toHaveBeenCalledWith(
      "charity_001",
      CharityAccountVerificationStatus.VERIFIED,
      expect.objectContaining({ verifiedBy: "admin_001" })
    );
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHARITY_ACCOUNT_VERIFIED" })
    );
  });

  it("trả về failure khi TN App chưa tìm thấy giao dịch", async () => {
    const uow = createMockUnitOfWork();
    const probePayment = buildPaymentRecord({
      id: "probe_notfound",
      type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      amount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 3600000),
    });

    const pendingAccount = buildCharityAccountRecord({
      verificationStatus: CharityAccountVerificationStatus.PENDING,
      verificationPaymentId: probePayment.id,
    });

    uow.charityAccounts.findById.mockResolvedValue(pendingAccount);
    uow.payments.findById.mockResolvedValue(probePayment);
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);

    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: false,
      transaction: null,
      rawResponse: "{}",
    });

    const useCase = new ConfirmCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Chưa tìm thấy giao dịch");
    expect(uow.payments.logVerification).toHaveBeenCalledWith(
      expect.objectContaining({ found: false })
    );
    expect(uow.payments.incrementCheckCount).toHaveBeenCalledTimes(1);
    // Không update verificationStatus
    expect(uow.charityAccounts.updateVerificationStatus).not.toHaveBeenCalledWith(
      expect.anything(),
      CharityAccountVerificationStatus.VERIFIED,
      expect.anything()
    );
  });

  it("trả về failure khi lỗi kết nối TN App", async () => {
    const uow = createMockUnitOfWork();
    const probePayment = buildPaymentRecord({
      id: "probe_network_err",
      type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      amount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 3600000),
    });

    uow.charityAccounts.findById.mockResolvedValue(
      buildCharityAccountRecord({
        verificationStatus: CharityAccountVerificationStatus.PENDING,
        verificationPaymentId: probePayment.id,
      })
    );
    uow.payments.findById.mockResolvedValue(probePayment);
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);

    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: false,
      transaction: null,
      error: "Network timeout",
    });

    const useCase = new ConfirmCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Không thể kết nối TN App");
  });

  it("payment hết hạn → cập nhật FAILED và trả về lỗi hết hạn", async () => {
    const uow = createMockUnitOfWork();
    const expiredPayment = buildPaymentRecord({
      id: "probe_expired_confirm",
      type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      amount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() - 3600000), // đã hết hạn
    });

    const pendingAccount = buildCharityAccountRecord({
      verificationStatus: CharityAccountVerificationStatus.PENDING,
      verificationPaymentId: expiredPayment.id,
    });

    const failedAccount = {
      ...pendingAccount,
      verificationStatus: CharityAccountVerificationStatus.FAILED,
      verificationNote: "Giao dịch xác thực đã hết hạn. Vui lòng khởi tạo lại.",
    };

    uow.charityAccounts.findById.mockResolvedValue(pendingAccount);
    uow.payments.findById.mockResolvedValue(expiredPayment);
    uow.payments.updateStatus.mockResolvedValue({
      ...expiredPayment,
      status: PaymentStatus.FAILED,
    } as any);
    uow.charityAccounts.updateVerificationStatus.mockResolvedValue(failedAccount);

    const useCase = new ConfirmCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("hết hạn");
    expect(uow.payments.updateStatus).toHaveBeenCalledWith(
      expiredPayment.id,
      PaymentStatus.FAILED
    );
    expect(uow.charityAccounts.updateVerificationStatus).toHaveBeenCalledWith(
      "charity_001",
      CharityAccountVerificationStatus.FAILED,
      expect.objectContaining({ verificationNote: expect.stringContaining("hết hạn") })
    );
    // Không gọi TN App API
    expect(mockTnClient.findTransactionByCode).not.toHaveBeenCalled();
  });

  it("trả về success ngay nếu tài khoản đã VERIFIED", async () => {
    const uow = createMockUnitOfWork();
    uow.charityAccounts.findById.mockResolvedValue(
      buildCharityAccountRecord({
        verificationStatus: CharityAccountVerificationStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedBy: "admin_001",
      })
    );

    const useCase = new ConfirmCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("đã được xác thực thành công");
    // Không gọi bất kỳ thứ gì thêm
    expect(uow.payments.findById).not.toHaveBeenCalled();
    expect(mockTnClient.findTransactionByCode).not.toHaveBeenCalled();
  });

  it("trả về failure nếu chưa khởi tạo xác thực (UNVERIFIED)", async () => {
    const uow = createMockUnitOfWork();
    uow.charityAccounts.findById.mockResolvedValue(
      buildCharityAccountRecord({
        verificationStatus: CharityAccountVerificationStatus.UNVERIFIED,
        verificationPaymentId: null,
      })
    );

    const useCase = new ConfirmCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Chưa có giao dịch xác thực");
  });

  it("trả về failure nếu tài khoản không tồn tại", async () => {
    const uow = createMockUnitOfWork();
    uow.charityAccounts.findById.mockResolvedValue(null);

    const useCase = new ConfirmCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "nonexistent",
      adminId: "admin_001",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Không tìm thấy");
  });

  it("trả về failure nếu payment record không tồn tại trong DB", async () => {
    const uow = createMockUnitOfWork();
    uow.charityAccounts.findById.mockResolvedValue(
      buildCharityAccountRecord({
        verificationStatus: CharityAccountVerificationStatus.PENDING,
        verificationPaymentId: "orphan_pay_id",
      })
    );
    uow.payments.findById.mockResolvedValue(null);

    const useCase = new ConfirmCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Không tìm thấy thông tin giao dịch");
  });

  it("idempotent: payment đã VERIFIED trả về success ngay", async () => {
    const uow = createMockUnitOfWork();
    const verifiedPayment = buildPaymentRecord({
      id: "probe_already_verified",
      type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      status: PaymentStatus.VERIFIED,
      expiresAt: new Date(Date.now() + 3600000),
    });

    const account = buildCharityAccountRecord({
      verificationStatus: CharityAccountVerificationStatus.PENDING,
      verificationPaymentId: verifiedPayment.id,
    });

    uow.charityAccounts.findById.mockResolvedValue(account);
    uow.payments.findById.mockResolvedValue(verifiedPayment);

    const useCase = new ConfirmCharityAccountVerificationUseCase(uow);
    const result = await useCase.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("đã được xác thực");
    // Không gọi TN App
    expect(mockTnClient.findTransactionByCode).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Integration flow: Initiate → Confirm (full cycle)
// ─────────────────────────────────────────────────────────────────────────────

describe("Charity Account Verification – Full Cycle", () => {
  afterEach(() => jest.clearAllMocks());

  it("luồng hoàn chỉnh: Initiate → Confirm thành công", async () => {
    const uow = createMockUnitOfWork();
    const account = buildCharityAccountRecord({
      id: "charity_full_cycle",
      name: "Quỹ Thử Nghiệm",
      accountNo: "9876543210",
      verificationStatus: CharityAccountVerificationStatus.UNVERIFIED,
    });

    // ─── Phase 1: Admin bắt đầu xác thực ─────────────────────────────────

    const probePayment = buildPaymentRecord({
      id: "probe_full_001",
      userId: "admin_001",
      type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      amount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
      shortCode: "FULLTEST",
      transactionCode: "HOCTUTHIEN XACTHUC FULLTEST",
      tnAccountNo: account.accountNo,
      tnAccountName: account.name,
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const pendingAccount = {
      ...account,
      verificationStatus: CharityAccountVerificationStatus.PENDING,
      verificationPaymentId: probePayment.id,
      verificationShortCode: "FULLTEST",
      verifiedBy: "admin_001",
    };

    uow.charityAccounts.findById.mockResolvedValue(account);
    mockConfigGetNumber(uow); // 1000 VND, 24h
    uow.payments.create.mockResolvedValue(probePayment);
    uow.charityAccounts.updateVerificationStatus.mockResolvedValue(pendingAccount);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    const initiateUC = new InitiateCharityAccountVerificationUseCase(uow);
    const initResult = await initiateUC.execute({
      accountId: "charity_full_cycle",
      adminId: "admin_001",
    });

    expect(initResult.amount).toBe(CHARITY_ACCOUNT_VERIFICATION_AMOUNT);
    expect(initResult.transactionCode).toBe("HOCTUTHIEN XACTHUC FULLTEST");
    expect(initResult.qrImageUrl).toContain("9876543210");

    // ─── Phase 2: Admin chuyển khoản xong, nhấn xác nhận ─────────────────

    const verifiedAccount = {
      ...pendingAccount,
      verificationStatus: CharityAccountVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
      verificationNote: "Xác thực thành công qua TN App. TxId: tn_full_001",
    };

    // Reset và chuẩn bị mock cho phase 2
    uow.charityAccounts.findById.mockResolvedValue(pendingAccount);
    uow.payments.findById.mockResolvedValue(probePayment);
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);
    uow.payments.updateStatus.mockResolvedValue({
      ...probePayment,
      status: PaymentStatus.VERIFIED,
    } as any);
    uow.charityAccounts.updateVerificationStatus.mockResolvedValue(verifiedAccount);

    mockTnClient.findTransactionByCode.mockResolvedValue({
      found: true,
      transaction: {
        id: "tn_full_001",
        refId: "FT_FULL_001",
        transactionTime: "2025-06-01T11:00:00",
        type: "CREDIT",
        transactionAmount: 1000,
        otherAccountDisplayName: "ADMIN TEST",
        otherAccountName: "ADMIN TEST",
        narrative: "HOCTUTHIEN XACTHUC FULLTEST",
        incognito: false,
      },
      rawResponse: "{}",
    });

    const confirmUC = new ConfirmCharityAccountVerificationUseCase(uow);
    const confirmResult = await confirmUC.execute({
      accountId: "charity_full_cycle",
      adminId: "admin_001",
    });

    expect(confirmResult.success).toBe(true);
    expect(confirmResult.account!.verificationStatus).toBe(
      CharityAccountVerificationStatus.VERIFIED
    );

    // Verify TN App được gọi với đúng thông số
    expect(mockTnClient.findTransactionByCode).toHaveBeenCalledWith(
      account.accountNo,
      probePayment.shortCode,
      expect.any(Date),
      CHARITY_ACCOUNT_VERIFICATION_AMOUNT
    );
  });

  it("luồng thất bại → retry → thành công", async () => {
    const uow = createMockUnitOfWork();
    const probePayment = buildPaymentRecord({
      id: "probe_retry",
      type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      amount: CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
      shortCode: "RETRYXYZ",
      status: PaymentStatus.PENDING,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const pendingAccount = buildCharityAccountRecord({
      verificationStatus: CharityAccountVerificationStatus.PENDING,
      verificationPaymentId: probePayment.id,
    });

    // ─── Lần 1: Chưa tìm thấy giao dịch ─────────────────────────────────

    uow.charityAccounts.findById.mockResolvedValue(pendingAccount);
    uow.payments.findById.mockResolvedValue(probePayment);
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);

    mockTnClient.findTransactionByCode.mockResolvedValueOnce({
      found: false,
      transaction: null,
      rawResponse: "{}",
    });

    const confirmUC = new ConfirmCharityAccountVerificationUseCase(uow);
    const failResult = await confirmUC.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    expect(failResult.success).toBe(false);
    expect(uow.payments.incrementCheckCount).toHaveBeenCalledTimes(1);

    // ─── Lần 2: Tìm thấy giao dịch ───────────────────────────────────────

    jest.clearAllMocks();
    const verifiedAccount = {
      ...pendingAccount,
      verificationStatus: CharityAccountVerificationStatus.VERIFIED,
    };

    uow.charityAccounts.findById.mockResolvedValue(pendingAccount);
    uow.payments.findById.mockResolvedValue(probePayment);
    uow.payments.logVerification.mockResolvedValue(undefined);
    uow.payments.incrementCheckCount.mockResolvedValue(undefined);
    uow.payments.updateStatus.mockResolvedValue({
      ...probePayment,
      status: PaymentStatus.VERIFIED,
    } as any);
    uow.charityAccounts.updateVerificationStatus.mockResolvedValue(verifiedAccount);
    uow.users.createAuditLog.mockResolvedValue(undefined);

    mockTnClient.findTransactionByCode.mockResolvedValueOnce({
      found: true,
      transaction: {
        id: "tn_retry_001",
        refId: "FT_RETRY",
        transactionTime: "2025-06-01T12:00:00",
        type: "CREDIT",
        transactionAmount: 1000,
        otherAccountDisplayName: "ADMIN",
        otherAccountName: "ADMIN",
        narrative: "HOCTUTHIEN XACTHUC RETRYXYZ",
        incognito: false,
      },
      rawResponse: "{}",
    });

    const successResult = await confirmUC.execute({
      accountId: "charity_001",
      adminId: "admin_001",
    });

    expect(successResult.success).toBe(true);
    expect(successResult.account!.verificationStatus).toBe(
      CharityAccountVerificationStatus.VERIFIED
    );
  });
});
