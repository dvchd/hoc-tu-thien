import { createId } from "@paralleldrive/cuid2";
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
import { PaymentRecord } from "../../../domain/repositories/IPaymentRepository";

// ─── Domain Port: Transaction Verification Service ────────────────────────────
// Interface defined at application layer to decouple from infrastructure
export interface ITransactionVerificationService {
  findTransactionByCode(
    accountNo: string,
    shortCode: string,
    createdAt: Date,
    expectedAmount: number
  ): Promise<{
    found: boolean;
    transaction: {
      id: string;
      refId: string;
      transactionAmount: number;
    } | null;
    rawResponse?: string;
    error?: string;
  }>;
}

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

// ─── Shared Utility ───────────────────────────────────────────────────────────

/**
 * Build payment info response from a payment record.
 * Shared between InitiateActivationUseCase and InitiateSessionFeePaymentUseCase
 * to avoid code duplication (DRY principle).
 */
export function buildPaymentInfoResponse(payment: PaymentRecord): ActivationPaymentInfo {
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

// ─── InitiateActivationUseCase ─────────────────────────────────────────────────

export class InitiateActivationUseCase {
  constructor(
    private readonly uow: IUnitOfWork,
    private readonly verificationService?: ITransactionVerificationService,
  ) {}

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
      return buildPaymentInfoResponse(validPending);
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

    if (isNaN(expiresAt.getTime())) {
      expiresAt.setTime(Date.now() + PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000);
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

    return buildPaymentInfoResponse(payment);
  }
}

// ─── VerifyPaymentUseCase ──────────────────────────────────────────────────────

export class VerifyPaymentUseCase {
  constructor(
    private readonly uow: IUnitOfWork,
    private readonly verificationService?: ITransactionVerificationService,
  ) {}

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

    // Lấy configured expiry hours để hiển thị deadline cho mentee (soft deadline)
    // BR32: "Quá thời hạn mà chưa hoàn tất donation thì mentee chưa đủ điều kiện đặt lịch mới"
    // → Payment KHÔNG có hard expiry. Mentee có thể thanh toán bất cứ lúc nào.
    // → BR09 (PAYMENT_PENDING) sẽ block mentee đặt lịch mới cho đến khi thanh toán xong.
    // expiresAt chỉ dùng để hiển thị "deadline khuyến nghị" trên UI.
    //
    // Không check expiresAt ở đây — nếu mentee đã chuyển khoản, verify phải thành công
    // dù vượt deadline. Tiền đã đi vào tài khoản thiện nguyện, không lý do gì reject.

    // Sử dụng injected verification service hoặc lazy-load từ infrastructure
    const verificationService = this.verificationService ?? await this.getVerificationService();

    // Gọi TN App API — bên ngoài transaction (network call có thể chậm)
    const result = await verificationService.findTransactionByCode(
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
          // BR38: No-show session KHÔNG được coi là hoàn tất thành công.
          // OQ05.1: Mentee vẫn phải thanh toán (tạo payment obligation), nhưng session
          // giữ nguyên trạng thái NO_SHOW thay vì chuyển sang COMPLETED.
          if (session.isNoShow) {
            // No-show: chỉ đánh dấu đã thanh toán, không chuyển COMPLETED,
            // không tăng mentor totalSessions (vì buổi học không diễn ra thực tế).
            await uow.sessions.updateStatus(payment.sessionId, SessionStatus.NO_SHOW, {
              notes: "Thanh toán no-show (mentee vắng mặt, vẫn phải thanh toán theo OQ05.1)",
            });
          } else {
            // Session bình thường: đánh dấu COMPLETED
            await uow.sessions.updateStatus(payment.sessionId, SessionStatus.COMPLETED);
            await uow.mentorProfiles.incrementTotalSessions(session.mentorId);
          }
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

  /**
   * Lazy-load verification service from infrastructure layer.
   * This allows existing code that doesn't inject the service to still work,
   * while new code can properly inject it for clean architecture.
   */
  private async getVerificationService(): Promise<ITransactionVerificationService> {
    const { tnAppClient } = await import("../../../infrastructure/external/ThienNguyenAppClient");
    return tnAppClient;
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
      return buildPaymentInfoResponse(sessionPending);
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

    // Guard against NaN from invalid config values
    if (isNaN(expiresAt.getTime())) {
      throw new Error("Cấu hình PAYMENT_EXPIRY_HOURS không hợp lệ");
    }

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

    return buildPaymentInfoResponse(payment);
  }
}
