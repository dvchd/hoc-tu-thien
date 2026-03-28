const { createId } = require("@paralleldrive/cuid2");
import { IUnitOfWork } from "../../interfaces/IUnitOfWork";
import {
  CharityAccountRecord,
  CreateCharityAccountInput,
  UpdateCharityAccountInput,
} from "../../../domain/repositories/ICharityAccountRepository";
import {
  PaymentType,
  PaymentStatus,
  CharityAccountVerificationStatus,
  CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
  PAYMENT_EXPIRY_HOURS,
  generateShortCode,
  buildTransactionContent,
  buildVietQRUrl,
} from "../../../domain/value-objects/Payment";
import { SYSTEM_CONFIG_KEYS } from "../../../domain/repositories/ISystemConfigRepository";
import { tnAppClient } from "../../../infrastructure/external/ThienNguyenAppClient";

// ─── CreateCharityAccountUseCase ─────────────────────────────────────────────

export class CreateCharityAccountUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    input: CreateCharityAccountInput & { adminId: string }
  ): Promise<CharityAccountRecord> {
    return this.uow.execute(async (uow) => {
      // Kiểm tra accountNo đã tồn tại chưa
      const existing = await uow.charityAccounts.findByAccountNo(input.accountNo);
      if (existing) {
        throw new Error(`Tài khoản ${input.accountNo} đã tồn tại trong hệ thống`);
      }

      // Nếu set isDefault = true → clear default trước (trong cùng transaction)
      if (input.isDefault) {
        await uow.charityAccounts.clearDefault();
      }

      const account = await uow.charityAccounts.create({
        ...input,
        createdBy: input.adminId,
      });

      await uow.users.createAuditLog({
        userId: input.adminId,
        action: "CHARITY_ACCOUNT_CREATED",
        newValues: { accountId: account.id, accountNo: account.accountNo, name: account.name },
        performedBy: input.adminId,
      });

      return account;
    });
  }
}

// ─── ListCharityAccountsUseCase ───────────────────────────────────────────────

export class ListCharityAccountsUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(options?: { isActive?: boolean; includeDeleted?: boolean }): Promise<CharityAccountRecord[]> {
    return this.uow.charityAccounts.findAll(options);
  }
}

// ─── UpdateCharityAccountUseCase ─────────────────────────────────────────────

export class UpdateCharityAccountUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    id: string,
    input: UpdateCharityAccountInput,
    adminId: string
  ): Promise<CharityAccountRecord> {
    return this.uow.execute(async (uow) => {
      const account = await uow.charityAccounts.findById(id);
      if (!account) throw new Error("Không tìm thấy tài khoản thiện nguyện");

      // Nếu set isDefault = true → clear default trước (trong cùng transaction)
      if (input.isDefault) {
        await uow.charityAccounts.clearDefault();
      }

      const updated = await uow.charityAccounts.update(id, input);

      await uow.users.createAuditLog({
        userId: adminId,
        action: "CHARITY_ACCOUNT_UPDATED",
        oldValues: { name: account.name, isActive: account.isActive, isDefault: account.isDefault },
        newValues: input,
        performedBy: adminId,
      });

      return updated;
    });
  }
}

// ─── DeleteCharityAccountUseCase ─────────────────────────────────────────────

export class DeleteCharityAccountUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(id: string, adminId: string): Promise<void> {
    return this.uow.execute(async (uow) => {
      const account = await uow.charityAccounts.findById(id);
      if (!account) throw new Error("Không tìm thấy tài khoản thiện nguyện");

      const usageCount = await uow.charityAccounts.getUsageCount(id);
      if (usageCount > 0) {
        throw new Error(
          `Không thể xóa tài khoản "${account.name}" vì đang được sử dụng (${usageCount} mentor/giao dịch). ` +
          `Hãy vô hiệu hóa thay vì xóa.`
        );
      }

      await uow.charityAccounts.delete(id);

      await uow.users.createAuditLog({
        userId: adminId,
        action: "CHARITY_ACCOUNT_DELETED",
        oldValues: { accountId: id, name: account.name, accountNo: account.accountNo },
        performedBy: adminId,
      });
    });
  }
}

// ─── InitiateCharityAccountVerificationUseCase ────────────────────────────────
//
// Luồng:
//   1. Admin kích hoạt xác thực → hệ thống tạo Payment record (probe transfer)
//   2. Hệ thống trả về thông tin QR + nội dung chuyển khoản 1,000 VND
//   3. Admin tự tay chuyển khoản (hoặc hệ thống sẽ hỗ trợ sau)
//   4. Admin nhấn "Tôi đã chuyển" → gọi ConfirmCharityAccountVerificationUseCase
//   5. Hệ thống poll TN App → xác nhận giao dịch → cập nhật verificationStatus = VERIFIED
//
// Giống hệt luồng kích hoạt Mentee nhưng target là tài khoản thiện nguyện.

export interface InitiateCharityVerificationDTO {
  accountId: string;
  adminId: string;
}

export interface CharityVerificationPaymentInfo {
  paymentId: string;
  transactionCode: string;
  shortCode: string;
  amount: number;
  tnAccountNo: string;
  tnAccountName: string;
  qrImageUrl: string;
  expiresAt: string;
  accountName: string;
  accountNo: string;
}

export class InitiateCharityAccountVerificationUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: InitiateCharityVerificationDTO): Promise<CharityVerificationPaymentInfo> {
    return this.uow.execute(async (uow) => {
      const account = await uow.charityAccounts.findById(input.accountId);
      if (!account) throw new Error("Không tìm thấy tài khoản thiện nguyện");
      if (account.isDeleted) throw new Error("Tài khoản thiện nguyện đã bị xóa");

      // Đã xác thực rồi → trả về thông tin đã có
      if (account.verificationStatus === CharityAccountVerificationStatus.VERIFIED) {
        throw new Error("Tài khoản này đã được xác thực thành công trước đó");
      }

      // Lấy payment cũ nếu đang PENDING và chưa hết hạn → tái sử dụng
      if (
        account.verificationStatus === CharityAccountVerificationStatus.PENDING &&
        account.verificationPaymentId
      ) {
        const existingPayment = await uow.payments.findById(account.verificationPaymentId);
        if (
          existingPayment &&
          existingPayment.status === PaymentStatus.PENDING &&
          existingPayment.expiresAt > new Date()
        ) {
          return this.buildPaymentInfo(existingPayment, account);
        }
      }

      // Tạo probe payment mới
      // Đọc amount từ SystemConfig (admin có thể cấu hình), fallback về constant
      const [verificationAmount, expiryHours] = await Promise.all([
        uow.systemConfig.getNumber(
          SYSTEM_CONFIG_KEYS.CHARITY_ACCOUNT_VERIFICATION_AMOUNT,
          CHARITY_ACCOUNT_VERIFICATION_AMOUNT
        ),
        uow.systemConfig.getNumber(
          SYSTEM_CONFIG_KEYS.PAYMENT_EXPIRY_HOURS,
          PAYMENT_EXPIRY_HOURS
        ),
      ]);

      const shortCode = generateShortCode(8);
      const transactionCode = buildTransactionContent(
        PaymentType.CHARITY_ACCOUNT_VERIFICATION,
        shortCode
      );
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

      const payment = await uow.payments.create({
        id: createId(),
        userId: input.adminId,          // admin là người tạo payment này
        type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
        amount: verificationAmount,
        transactionCode,
        shortCode,
        tnAccountNo: account.accountNo, // chuyển đến chính tài khoản cần xác thực
        tnAccountName: account.name,
        expiresAt,
      });

      // Đánh dấu tài khoản đang PENDING xác thực
      await uow.charityAccounts.updateVerificationStatus(
        input.accountId,
        CharityAccountVerificationStatus.PENDING,
        {
          verificationPaymentId: payment.id,
          verificationShortCode: shortCode,
          verifiedBy: input.adminId,
        }
      );

      await uow.users.createAuditLog({
        userId: input.adminId,
        action: "CHARITY_ACCOUNT_VERIFICATION_INITIATED",
        newValues: {
          accountId: input.accountId,
          accountNo: account.accountNo,
          paymentId: payment.id,
          amount: verificationAmount,
        },
        performedBy: input.adminId,
      });

      return this.buildPaymentInfo(payment, account);
    });
  }

  private buildPaymentInfo(
    payment: { id: string; transactionCode: string; shortCode: string; amount: number;
               tnAccountNo: string; tnAccountName: string | null; expiresAt: Date },
    account: CharityAccountRecord
  ): CharityVerificationPaymentInfo {
    const qrImageUrl = buildVietQRUrl({
      accountNo: payment.tnAccountNo,
      accountName: payment.tnAccountName ?? account.name,
      amount: payment.amount,
      addInfo: payment.transactionCode,
    });

    return {
      paymentId: payment.id,
      transactionCode: payment.transactionCode,
      shortCode: payment.shortCode,
      amount: payment.amount,
      tnAccountNo: payment.tnAccountNo,
      tnAccountName: payment.tnAccountName ?? account.name,
      qrImageUrl,
      expiresAt: payment.expiresAt.toISOString(),
      accountName: account.name,
      accountNo: account.accountNo,
    };
  }
}

// ─── ConfirmCharityAccountVerificationUseCase ─────────────────────────────────
//
// Admin nhấn "Tôi đã chuyển khoản" → poll TN App → cập nhật trạng thái

export interface ConfirmCharityVerificationDTO {
  accountId: string;
  adminId: string;
}

export interface ConfirmCharityVerificationResult {
  success: boolean;
  message: string;
  account?: CharityAccountRecord;
}

export class ConfirmCharityAccountVerificationUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(
    input: ConfirmCharityVerificationDTO
  ): Promise<ConfirmCharityVerificationResult> {
    const account = await this.uow.charityAccounts.findById(input.accountId);
    if (!account) {
      return { success: false, message: "Không tìm thấy tài khoản thiện nguyện" };
    }

    // Đã xác thực thành công trước đó
    if (account.verificationStatus === CharityAccountVerificationStatus.VERIFIED) {
      return {
        success: true,
        message: "Tài khoản đã được xác thực thành công trước đó",
        account,
      };
    }

    // Chưa khởi tạo xác thực
    if (
      account.verificationStatus !== CharityAccountVerificationStatus.PENDING ||
      !account.verificationPaymentId
    ) {
      return {
        success: false,
        message: "Chưa có giao dịch xác thực nào được khởi tạo. Vui lòng bấm 'Bắt đầu xác thực' trước.",
      };
    }

    const payment = await this.uow.payments.findById(account.verificationPaymentId);
    if (!payment) {
      return { success: false, message: "Không tìm thấy thông tin giao dịch xác thực" };
    }

    // Payment đã hết hạn
    if (payment.expiresAt < new Date()) {
      await this.uow.payments.updateStatus(payment.id, PaymentStatus.FAILED);
      await this.uow.charityAccounts.updateVerificationStatus(
        input.accountId,
        CharityAccountVerificationStatus.FAILED,
        { verificationNote: "Giao dịch xác thực đã hết hạn. Vui lòng khởi tạo lại." }
      );
      return {
        success: false,
        message: "Giao dịch xác thực đã hết hạn. Vui lòng khởi tạo xác thực mới.",
      };
    }

    // Payment đã được xác nhận trước đó (idempotent)
    if (payment.status === PaymentStatus.VERIFIED) {
      return {
        success: true,
        message: "Tài khoản đã được xác thực thành công",
        account,
      };
    }

    // Gọi TN App API để tìm giao dịch — ngoài transaction vì network call có thể chậm
    const result = await tnAppClient.findTransactionByCode(
      payment.tnAccountNo,
      payment.shortCode,
      payment.createdAt,
      payment.amount
    );

    if (!result.found) {
      // Ghi log thất bại, cập nhật checkCount
      await this.uow.payments.logVerification({
        paymentId: payment.id,
        found: false,
        apiResponse: result.rawResponse,
        error: result.error,
      });
      await this.uow.payments.incrementCheckCount(payment.id, new Date());

      const message = result.error
        ? "Không thể kết nối TN App để xác minh. Vui lòng thử lại sau."
        : "Chưa tìm thấy giao dịch xác thực. Vui lòng đợi vài phút và thử lại.";

      return { success: false, message };
    }

    // Tìm thấy giao dịch → cập nhật trong transaction
    const tx = result.transaction!;
    const updatedAccount = await this.uow.execute(async (uow) => {
      await uow.payments.logVerification({
        paymentId: payment.id,
        found: true,
        apiResponse: result.rawResponse,
      });
      await uow.payments.incrementCheckCount(payment.id, new Date());
      await uow.payments.updateStatus(payment.id, PaymentStatus.VERIFIED, {
        tnTransactionId: tx.id,
        tnRefId: tx.refId,
        verifiedAmount: tx.transactionAmount,
        verifiedBy: "system",
      });

      const verified = await uow.charityAccounts.updateVerificationStatus(
        input.accountId,
        CharityAccountVerificationStatus.VERIFIED,
        {
          verificationPaymentId: payment.id,
          verifiedAt: new Date(),
          verifiedBy: input.adminId,
          verificationNote: `Xác thực thành công qua TN App. TxId: ${tx.id}`,
        }
      );

      await uow.users.createAuditLog({
        userId: input.adminId,
        action: "CHARITY_ACCOUNT_VERIFIED",
        newValues: {
          accountId: input.accountId,
          accountNo: account.accountNo,
          tnTransactionId: tx.id,
          verifiedAmount: tx.transactionAmount,
        },
        performedBy: input.adminId,
      });

      return verified;
    });

    return {
      success: true,
      message: `✅ Xác thực tài khoản "${account.name}" thành công! Giao dịch đã được ghi nhận qua Thiện Nguyện App.`,
      account: updatedAccount,
    };
  }
}
