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
  DEFAULT_TN_ACTIVATION_ACCOUNT,
  DEFAULT_TN_ACTIVATION_ACCOUNT_NAME,
} from "../../../domain/value-objects/Payment";
import { UserStatus } from "../../../domain/value-objects/UserStatus";
import { tnAppClient } from "../../../infrastructure/external/ThienNguyenAppClient";
import { PaymentRecord } from "../../../domain/repositories/IPaymentRepository";
import { createId } from "@paralleldrive/cuid2";

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
  triggeredBy: string; // userId who clicked "Tôi đã chuyển khoản"
}

export interface VerifyPaymentResult {
  success: boolean;
  message: string;
  payment?: PaymentRecord;
}

// ─── InitiateActivationUseCase ─────────────────────────────────────────────────
// Tạo yêu cầu kích hoạt tài khoản với QR code thanh toán 10k

export class InitiateActivationUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: InitiateActivationDTO): Promise<ActivationPaymentInfo> {
    const user = await this.uow.users.findById(input.userId);
    if (!user) throw new Error("Không tìm thấy người dùng");

    if (user.status === UserStatus.ACTIVE) {
      throw new Error("Tài khoản đã được kích hoạt");
    }

    // Kiểm tra xem có payment PENDING chưa hết hạn không
    const existingPending = await this.uow.payments.findPendingByUserId(
      input.userId,
      PaymentType.ACTIVATION
    );

    const validPending = existingPending.find(
      (p) => p.status === PaymentStatus.PENDING && p.expiresAt > new Date()
    );

    if (validPending) {
      // Trả lại thông tin payment cũ
      return this.buildPaymentInfo(validPending);
    }

    // Tạo payment mới
    const shortCode = generateShortCode(8);
    const transactionCode = buildTransactionContent(
      PaymentType.ACTIVATION,
      shortCode
    );
    const expiresAt = new Date(
      Date.now() + PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000
    );

    const payment = await this.uow.payments.create({
      id: createId(),
      userId: input.userId,
      type: PaymentType.ACTIVATION,
      amount: ACTIVATION_AMOUNT,
      transactionCode,
      shortCode,
      tnAccountNo: DEFAULT_TN_ACTIVATION_ACCOUNT,
      tnAccountName: DEFAULT_TN_ACTIVATION_ACCOUNT_NAME,
      expiresAt,
    });

    return this.buildPaymentInfo(payment);
  }

  private buildPaymentInfo(payment: PaymentRecord): ActivationPaymentInfo {
    const qrImageUrl = buildVietQRUrl({
      accountNo: payment.tnAccountNo,
      accountName: payment.tnAccountName ?? DEFAULT_TN_ACTIVATION_ACCOUNT_NAME,
      amount: payment.amount,
      addInfo: payment.transactionCode,
    });

    return {
      paymentId: payment.id,
      transactionCode: payment.transactionCode,
      shortCode: payment.shortCode,
      amount: payment.amount,
      tnAccountNo: payment.tnAccountNo,
      tnAccountName: payment.tnAccountName ?? DEFAULT_TN_ACTIVATION_ACCOUNT_NAME,
      qrImageUrl,
      expiresAt: payment.expiresAt.toISOString(),
    };
  }
}

// ─── VerifyPaymentUseCase ──────────────────────────────────────────────────────
// Gọi TN App API để xác minh giao dịch (chỉ khi user trigger)

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

    // Gọi TN App API (ngoài transaction vì là external call)
    const result = await tnAppClient.findTransactionByCode(
      payment.tnAccountNo,
      payment.shortCode,
      payment.createdAt,
      payment.amount
    );

    // Ghi log và tăng check count (không cần transaction)
    await this.uow.payments.logVerification({
      paymentId: payment.id,
      found: result.found,
      apiResponse: result.rawResponse,
      error: result.error,
    });

    await this.uow.payments.incrementCheckCount(payment.id, new Date());

    if (!result.found) {
      return {
        success: false,
        message:
          result.error
            ? "Không thể kết nối TN App. Vui lòng thử lại sau."
            : "Chưa tìm thấy giao dịch. Vui lòng đợi vài phút và thử lại.",
        payment,
      };
    }

    // Xác nhận thành công → cập nhật trong transaction
    const tx = result.transaction!;
    const updatedPayment = await this.uow.execute(async (uow) => {
      const updated = await uow.payments.updateStatus(
        payment.id,
        PaymentStatus.VERIFIED,
        {
          tnTransactionId: tx.id,
          tnRefId: tx.refId,
          verifiedAmount: tx.transactionAmount,
          verifiedBy: "system",
        }
      );

      // Nếu là ACTIVATION → kích hoạt tài khoản
      if (payment.type === PaymentType.ACTIVATION) {
        await this.activateUser(payment.userId, uow);
      }

      // Nếu là SESSION_FEE → đánh dấu session completed
      if (payment.type === PaymentType.SESSION_FEE && payment.sessionId) {
        const session = await uow.sessions.findById(payment.sessionId);
        if (session?.status === SessionStatus.PAYMENT_PENDING) {
          await uow.sessions.updateStatus(payment.sessionId, SessionStatus.COMPLETED);
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
// Tạo yêu cầu thanh toán học phí sau buổi học

export class InitiateSessionFeePaymentUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(sessionId: string, userId: string): Promise<ActivationPaymentInfo> {
    const session = await this.uow.sessions.findById(sessionId);
    if (!session) throw new Error("Không tìm thấy buổi học");
    if (session.menteeId !== userId) throw new Error("Không có quyền truy cập");
    if (session.fee === 0) throw new Error("Buổi học miễn phí, không cần thanh toán");
    if (session.status !== "PAYMENT_PENDING") {
      throw new Error("Buổi học không trong trạng thái chờ thanh toán");
    }

    // Kiểm tra payment đang pending
    const existingPending = await this.uow.payments.findPendingByUserId(
      userId,
      PaymentType.SESSION_FEE
    );
    const sessionPending = existingPending.find(
      (p) =>
        p.sessionId === sessionId &&
        p.status === PaymentStatus.PENDING &&
        p.expiresAt > new Date()
    );

    // Lấy TN account của mentor
    const mentor = await this.uow.users.findById(session.mentorId);
    if (!mentor) throw new Error("Không tìm thấy mentor");

    // Lấy mentor profile để lấy tn account
    // Sử dụng prisma trực tiếp qua uow (simplified)
    const tnAccountNo =
      DEFAULT_TN_ACTIVATION_ACCOUNT; // Fallback, thực tế lấy từ MentorProfile
    const tnAccountName = DEFAULT_TN_ACTIVATION_ACCOUNT_NAME;

    if (sessionPending) {
      return this.buildPaymentInfo(sessionPending);
    }

    const shortCode = generateShortCode(8);
    const transactionCode = buildTransactionContent(
      PaymentType.SESSION_FEE,
      shortCode
    );
    const expiresAt = new Date(
      Date.now() + PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000
    );

    const payment = await this.uow.payments.create({
      id: createId(),
      userId,
      sessionId,
      type: PaymentType.SESSION_FEE,
      amount: session.fee,
      transactionCode,
      shortCode,
      tnAccountNo,
      tnAccountName,
      expiresAt,
    });

    return this.buildPaymentInfo(payment);
  }

  private buildPaymentInfo(payment: PaymentRecord): ActivationPaymentInfo {
    const qrImageUrl = buildVietQRUrl({
      accountNo: payment.tnAccountNo,
      accountName: payment.tnAccountName ?? DEFAULT_TN_ACTIVATION_ACCOUNT_NAME,
      amount: payment.amount,
      addInfo: payment.transactionCode,
    });

    return {
      paymentId: payment.id,
      transactionCode: payment.transactionCode,
      shortCode: payment.shortCode,
      amount: payment.amount,
      tnAccountNo: payment.tnAccountNo,
      tnAccountName: payment.tnAccountName ?? DEFAULT_TN_ACTIVATION_ACCOUNT_NAME,
      qrImageUrl,
      expiresAt: payment.expiresAt.toISOString(),
    };
  }
}
