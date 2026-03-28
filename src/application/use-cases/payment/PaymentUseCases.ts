// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createId } = require("@paralleldrive/cuid2");
import { IUnitOfWork } from "../../interfaces/IUnitOfWork";
import {
  PaymentType,
  PaymentStatus,
  SessionStatus,
  generateShortCode,
  buildTransactionContent,
  buildVietQRUrl,
  ACTIVATION_AMOUNT,
  PAYMENT_EXPIRY_HOURS,
} from "../../../domain/value-objects/Payment";
import { SYSTEM_CONFIG_KEYS } from "../../../domain/repositories/ISystemConfigRepository";
import { UserStatus } from "../../../domain/value-objects/UserStatus";
import { tnAppClient } from "../../../infrastructure/external/ThienNguyenAppClient";
import { PaymentRecord } from "../../../domain/repositories/IPaymentRepository";

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface InitiateActivationDTO {
  userId: string;
}

export interface ActivationPaymentInfo {
  paymentId: string;
  transactionCode: string;
  shortCode: string;
  amount: number;
  tnAccountNo: string;
  tnAccountName: string;
  qrImageUrl: string;
  expiresAt: string;
}

export interface VerifyPaymentDTO {
  paymentId: string;
  triggeredBy: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  message: string;
  payment?: PaymentRecord;
}

// ─── InitiateActivationUseCase ─────────────────────────────────────────────────

export class InitiateActivationUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: InitiateActivationDTO): Promise<ActivationPaymentInfo> {
    const user = await this.uow.users.findById(input.userId);
    if (!user) throw new Error("Không tìm thấy người dùng");

    if (user.status === UserStatus.ACTIVE) {
      throw new Error("Tài khoản đã được kích hoạt");
    }

    // Kiểm tra payment PENDING chưa hết hạn
    const existingPending = await this.uow.payments.findPendingByUserId(
      input.userId,
      PaymentType.ACTIVATION
    );
    const validPending = existingPending.find(
      (p) => p.status === PaymentStatus.PENDING && p.expiresAt > new Date()
    );
    if (validPending) {
      return this.buildPaymentInfo(validPending);
    }

    // Lấy activation amount, default charity account, và expiry hours đồng thời
    const [activationAmountStr, defaultAccount, expiryHoursNum] = await Promise.all([
      this.uow.systemConfig.get(SYSTEM_CONFIG_KEYS.ACTIVATION_AMOUNT),
      this.uow.charityAccounts.findDefault(),
      this.uow.systemConfig.getNumber(SYSTEM_CONFIG_KEYS.PAYMENT_EXPIRY_HOURS, PAYMENT_EXPIRY_HOURS),
    ]);

    // Tài khoản nhận tiền phải được Admin cấu hình qua CharityAccount (isDefault = true)
    if (!defaultAccount) {
      throw new Error(
        "Chưa có tài khoản thiện nguyện mặc định. Admin vui lòng vào Cài đặt → Tài khoản thiện nguyện " +
        "và đánh dấu một tài khoản là mặc định trước khi người dùng có thể kích hoạt."
      );
    }

    const amount = activationAmountStr ? parseInt(activationAmountStr, 10) : ACTIVATION_AMOUNT;
    const accountNo = defaultAccount.accountNo;
    const accountName = defaultAccount.name;

    const shortCode = generateShortCode(8);
    const transactionCode = buildTransactionContent(PaymentType.ACTIVATION, shortCode);
    const expiresAt = new Date(Date.now() + expiryHoursNum * 60 * 60 * 1000);
    
    // Safety check for NaN or invalid dates in tests
    if (isNaN(expiresAt.getTime())) {
       expiresAt.setTime(Date.now() + 24 * 60 * 60 * 1000);
    }

    const payment = await this.uow.payments.create({
      id: createId(),
      userId: input.userId,
      type: PaymentType.ACTIVATION,
      amount,
      transactionCode,
      shortCode,
      tnAccountNo: accountNo,
      tnAccountName: accountName,
      expiresAt,
    });

    return this.buildPaymentInfo(payment);
  }

  private buildPaymentInfo(payment: PaymentRecord): ActivationPaymentInfo {
    const qrImageUrl = buildVietQRUrl({
      accountNo: payment.tnAccountNo,
      accountName: payment.tnAccountName ?? "",
      amount: payment.amount,
      addInfo: payment.transactionCode,
    });

    return {
      paymentId: payment.id,
      transactionCode: payment.transactionCode,
      shortCode: payment.shortCode,
      amount: payment.amount,
      tnAccountNo: payment.tnAccountNo,
      tnAccountName: payment.tnAccountName ?? "",
      qrImageUrl,
      expiresAt: payment.expiresAt.toISOString(),
    };
  }
}

// ─── VerifyPaymentUseCase ──────────────────────────────────────────────────────

export class VerifyPaymentUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: VerifyPaymentDTO): Promise<VerifyPaymentResult> {
    const payment = await this.uow.payments.findById(input.paymentId);
    if (!payment) {
      return { success: false, message: "Không tìm thấy yêu cầu thanh toán" };
    }

    if (payment.status === PaymentStatus.VERIFIED) {
      return { success: true, message: "Giao dịch đã được xác nhận trước đó", payment };
    }

    if (payment.status === PaymentStatus.FAILED) {
      return { success: false, message: "Yêu cầu thanh toán đã hết hạn" };
    }

    if (payment.expiresAt < new Date()) {
      await this.uow.payments.updateStatus(payment.id, PaymentStatus.FAILED);
      return { success: false, message: "Yêu cầu thanh toán đã hết hạn (24h)" };
    }

    // Gọi TN App API — bên ngoài transaction (network call có thể chậm)
    const result = await tnAppClient.findTransactionByCode(
      payment.tnAccountNo,
      payment.shortCode,
      payment.createdAt,
      payment.amount
    );

    if (!result.found) {
      // Ghi log và cập nhật checkCount cho lần thử thất bại — không cần transaction
      await this.uow.payments.logVerification({
        paymentId: payment.id,
        found: false,
        apiResponse: result.rawResponse,
        error: result.error,
      });
      await this.uow.payments.incrementCheckCount(payment.id, new Date());

      return {
        success: false,
        message: result.error
          ? "Không thể kết nối TN App. Vui lòng thử lại sau."
          : "Chưa tìm thấy giao dịch. Vui lòng đợi vài phút và thử lại.",
        payment,
      };
    }

    // Tìm thấy giao dịch: log + cập nhật trạng thái trong cùng transaction để nhất quán
    const tx = result.transaction!;
    const updatedPayment = await this.uow.execute(async (uow) => {
      // Ghi log xác minh thành công
      await uow.payments.logVerification({
        paymentId: payment.id,
        found: true,
        apiResponse: result.rawResponse,
        error: undefined,
      });
      await uow.payments.incrementCheckCount(payment.id, new Date());

      const updated = await uow.payments.updateStatus(payment.id, PaymentStatus.VERIFIED, {
        tnTransactionId: tx.id,
        tnRefId: tx.refId,
        verifiedAmount: tx.transactionAmount,
        verifiedBy: "system",
      });

      if (payment.type === PaymentType.ACTIVATION) {
        await this.activateUser(payment.userId, uow);
      }

      if (payment.type === PaymentType.SESSION_FEE && payment.sessionId) {
        const session = await uow.sessions.findById(payment.sessionId);
        if (session?.status === SessionStatus.PAYMENT_PENDING) {
          await uow.sessions.updateStatus(payment.sessionId, SessionStatus.COMPLETED);
          // Cập nhật totalSessions trên MentorProfile sau khi thanh toán xong
          await uow.mentorProfiles.incrementTotalSessions(session.mentorId);
        }
      }

      return updated;
    });

    return {
      success: true,
      message:
        payment.type === PaymentType.ACTIVATION
          ? "🎉 Kích hoạt tài khoản thành công! Bạn có thể bắt đầu học ngay."
          : "✅ Thanh toán học phí thành công! Bạn có thể đặt lịch học tiếp.",
      payment: updatedPayment,
    };
  }

  private async activateUser(userId: string, uow: IUnitOfWork) {
    const user = await uow.users.findById(userId);
    if (!user) return;

    const activated = user.activate("system");
    await uow.users.update(activated);

    await uow.users.createAuditLog({
      userId,
      action: "ACCOUNT_ACTIVATED",
      newValues: { status: "ACTIVE", activatedBy: "payment_verified" },
      performedBy: "system",
    });
  }
}

// ─── InitiateSessionFeePaymentUseCase ─────────────────────────────────────────

export class InitiateSessionFeePaymentUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(sessionId: string, userId: string): Promise<ActivationPaymentInfo> {
    const session = await this.uow.sessions.findById(sessionId);
    if (!session) throw new Error("Không tìm thấy buổi học");
    if (session.menteeId !== userId) throw new Error("Không có quyền truy cập");
    if (session.fee === 0) throw new Error("Buổi học miễn phí, không cần thanh toán");
    if (session.status !== SessionStatus.PAYMENT_PENDING) {
      throw new Error("Buổi học không trong trạng thái chờ thanh toán");
    }

    // Reuse existing pending payment nếu còn hợp lệ
    const existingPending = await this.uow.payments.findPendingByUserId(userId, PaymentType.SESSION_FEE);
    const sessionPending = existingPending.find(
      (p) => p.sessionId === sessionId && p.status === PaymentStatus.PENDING && p.expiresAt > new Date()
    );
    if (sessionPending) {
      return this.buildPaymentInfo(sessionPending);
    }

    // Xác định tài khoản nhận học phí theo thứ tự ưu tiên:
    // 1. CharityAccount gắn với mentor (charityAccountId trên MentorProfile)
    // 2. Legacy: tnAccountNo trực tiếp trên MentorProfile (cũ, sẽ deprecated)
    // 3. Default charity account của hệ thống (Admin đánh dấu isDefault = true)
    // Không có fallback về env — nếu thiếu cấu hình thì throw rõ ràng.
    const mentorProfileFee = await this.uow.sessions.getMentorProfileFee(session.mentorId);

    let accountNo: string | null = null;
    let accountName: string | null = null;

    // Priority 1: charityAccount từ CharityAccount table
    if (mentorProfileFee?.charityAccountId) {
      const charityAccount = await this.uow.charityAccounts.findById(mentorProfileFee.charityAccountId);
      if (charityAccount?.isActive) {
        accountNo = charityAccount.accountNo;
        accountName = charityAccount.name;
      }
    }
    // Priority 2: legacy tnAccountNo trực tiếp trên MentorProfile
    if (!accountNo && mentorProfileFee?.tnAccountNo) {
      accountNo = mentorProfileFee.tnAccountNo;
      accountName = mentorProfileFee.tnAccountName ?? null;
    }
    // Priority 3: default charity account của hệ thống
    if (!accountNo) {
      const defaultAccount = await this.uow.charityAccounts.findDefault();
      if (defaultAccount) {
        accountNo = defaultAccount.accountNo;
        accountName = defaultAccount.name;
      }
    }

    if (!accountNo) {
      throw new Error(
        "Mentor chưa cấu hình tài khoản nhận học phí và hệ thống chưa có tài khoản thiện nguyện mặc định. " +
        "Vui lòng liên hệ Admin."
      );
    }

    const expiryHours = await this.uow.systemConfig.getNumber(
      SYSTEM_CONFIG_KEYS.PAYMENT_EXPIRY_HOURS,
      PAYMENT_EXPIRY_HOURS
    );

    const shortCode = generateShortCode(8);
    const transactionCode = buildTransactionContent(PaymentType.SESSION_FEE, shortCode);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const payment = await this.uow.payments.create({
      id: createId(),
      userId,
      sessionId,
      amount: session.fee,
      type: PaymentType.SESSION_FEE,
      transactionCode,
      shortCode,
      tnAccountNo: accountNo,
      tnAccountName: accountName ?? undefined,
      expiresAt: expiresAt,
    });

    return this.buildPaymentInfo(payment);
  }

  private buildPaymentInfo(payment: PaymentRecord): ActivationPaymentInfo {
    const qrImageUrl = buildVietQRUrl({
      accountNo: payment.tnAccountNo,
      accountName: payment.tnAccountName ?? "",
      amount: payment.amount,
      addInfo: payment.transactionCode,
    });

    return {
      paymentId: payment.id,
      transactionCode: payment.transactionCode,
      shortCode: payment.shortCode,
      amount: payment.amount,
      tnAccountNo: payment.tnAccountNo,
      tnAccountName: payment.tnAccountName ?? "",
      qrImageUrl,
      expiresAt: payment.expiresAt.toISOString(),
    };
  }
}
