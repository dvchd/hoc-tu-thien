// ─── PaymentType ─────────────────────────────────────────────────────────────

export enum PaymentType {
  ACTIVATION = "ACTIVATION",
  SESSION_FEE = "SESSION_FEE",
  CHARITY_ACCOUNT_VERIFICATION = "CHARITY_ACCOUNT_VERIFICATION",
}

export const PaymentTypeLabels: Record<PaymentType, string> = {
  [PaymentType.ACTIVATION]: "Kích hoạt tài khoản",
  [PaymentType.SESSION_FEE]: "Học phí buổi học",
  [PaymentType.CHARITY_ACCOUNT_VERIFICATION]: "Xác thực tài khoản thiện nguyện",
};

// ─── PaymentStatus ────────────────────────────────────────────────────────────

export enum PaymentStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: "Chờ xác nhận",
  [PaymentStatus.VERIFIED]: "Đã xác nhận",
  [PaymentStatus.FAILED]: "Thất bại / Hết hạn",
  [PaymentStatus.REFUNDED]: "Đã hoàn tiền",
};

export const PaymentStatusColors: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: "bg-amber-100 text-amber-700",
  [PaymentStatus.VERIFIED]: "bg-green-100 text-green-700",
  [PaymentStatus.FAILED]: "bg-red-100 text-red-700",
  [PaymentStatus.REFUNDED]: "bg-blue-100 text-blue-700",
};

// ─── TransactionCode Generator ────────────────────────────────────────────────
// Quy tắc: chỉ dùng chữ HOA, không dùng số (TN App ẩn 3 số liên tiếp thành xxx)
// Format: HOCTUTHIEN KICHHOAT ABCXYZ  (6 ký tự chữ ngẫu nhiên)
//         HOCTUTHIEN HOCPHI BCDEFG

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // bỏ I, O tránh nhầm 1, 0

export function generateShortCode(length = 8): string {
  return Array.from(
    { length },
    () => LETTERS[Math.floor(Math.random() * LETTERS.length)]
  ).join("");
}

export function buildTransactionContent(
  type: PaymentType,
  shortCode: string
): string {
  let prefix: string;
  if (type === PaymentType.ACTIVATION) prefix = "KICHHOAT";
  else if (type === PaymentType.CHARITY_ACCOUNT_VERIFICATION) prefix = "XACTHUC";
  else prefix = "HOCPHI";
  return `HOCTUTHIEN ${prefix} ${shortCode}`;
}

export function parseTransactionContent(narrative: string): {
  isHocTuThien: boolean;
  type: PaymentType | null;
  shortCode: string | null;
} {
  const upper = narrative.toUpperCase().replace(/\s+/g, " ");

  if (!upper.includes("HOCTUTHIEN")) {
    return { isHocTuThien: false, type: null, shortCode: null };
  }

  const kichhoatMatch = upper.match(/HOCTUTHIEN\s+KICHHOAT\s+([A-Z]{4,8})/);
  if (kichhoatMatch) {
    return {
      isHocTuThien: true,
      type: PaymentType.ACTIVATION,
      shortCode: kichhoatMatch[1],
    };
  }

  const hocphiMatch = upper.match(/HOCTUTHIEN\s+HOCPHI\s+([A-Z]{4,8})/);
  if (hocphiMatch) {
    return {
      isHocTuThien: true,
      type: PaymentType.SESSION_FEE,
      shortCode: hocphiMatch[1],
    };
  }

  const xacthuMatch = upper.match(/HOCTUTHIEN\s+XACTHUC\s+([A-Z]{4,8})/);
  if (xacthuMatch) {
    return {
      isHocTuThien: true,
      type: PaymentType.CHARITY_ACCOUNT_VERIFICATION,
      shortCode: xacthuMatch[1],
    };
  }

  return { isHocTuThien: true, type: null, shortCode: null };
}

// ─── VietQR URL Builder ───────────────────────────────────────────────────────
// Dùng VietQR.io để sinh QR tự động điền thông tin chuyển khoản
// MB Bank bin: 970422

export const MB_BANK_BIN = "970422";

export interface VietQRParams {
  accountNo: string;
  accountName: string;
  amount: number;
  addInfo: string;
  template?: "compact" | "compact2" | "print" | "qr_only";
}

export function buildVietQRUrl({
  accountNo,
  accountName,
  amount,
  addInfo,
  template = "compact2",
}: VietQRParams): string {
  const base = `https://img.vietqr.io/image/${MB_BANK_BIN}-${accountNo}-${template}.png`;
  const query =
    `amount=${encodeURIComponent(amount.toString())}` +
    `&addInfo=${encodeURIComponent(addInfo)}` +
    `&accountName=${encodeURIComponent(accountName)}`;
  return `${base}?${query}`;
}

// ─── SessionStatus ────────────────────────────────────────────────────────────

export enum SessionStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  NO_SHOW = "NO_SHOW",
}

export const SessionStatusLabels: Record<SessionStatus, string> = {
  [SessionStatus.PENDING]: "Chờ xác nhận",
  [SessionStatus.CONFIRMED]: "Đã xác nhận",
  [SessionStatus.IN_PROGRESS]: "Đang diễn ra",
  [SessionStatus.COMPLETED]: "Hoàn thành",
  [SessionStatus.CANCELLED]: "Đã huỷ",
  [SessionStatus.PAYMENT_PENDING]: "Chờ thanh toán",
  [SessionStatus.NO_SHOW]: "Vắng mặt",
};

export const SessionStatusColors: Record<SessionStatus, string> = {
  [SessionStatus.PENDING]: "bg-amber-100 text-amber-700",
  [SessionStatus.CONFIRMED]: "bg-blue-100 text-blue-700",
  [SessionStatus.IN_PROGRESS]: "bg-jade-100 text-jade-700",
  [SessionStatus.COMPLETED]: "bg-green-100 text-green-700",
  [SessionStatus.CANCELLED]: "bg-red-100 text-red-700",
  [SessionStatus.PAYMENT_PENDING]: "bg-orange-100 text-orange-700",
  [SessionStatus.NO_SHOW]: "bg-gray-100 text-gray-600",
};

// ─── MentorApplicationStatus ──────────────────────────────────────────────────

export enum MentorApplicationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export const MentorApplicationStatusLabels: Record<MentorApplicationStatus, string> = {
  [MentorApplicationStatus.PENDING]: "Chờ xét duyệt",
  [MentorApplicationStatus.APPROVED]: "Đã duyệt",
  [MentorApplicationStatus.REJECTED]: "Bị từ chối",
};

// ─── ReportStatus / ReportReason ─────────────────────────────────────────────

export enum ReportStatus {
  PENDING = "PENDING",
  REVIEWED = "REVIEWED",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

export enum ReportReason {
  INAPPROPRIATE = "INAPPROPRIATE",
  MISCONDUCT = "MISCONDUCT",
  NO_SHOW_DISPUTE = "NO_SHOW_DISPUTE",
  OTHER = "OTHER",
}

export const ReportReasonLabels: Record<ReportReason, string> = {
  [ReportReason.INAPPROPRIATE]: "Nội dung không phù hợp",
  [ReportReason.MISCONDUCT]: "Hành vi không đúng mực",
  [ReportReason.NO_SHOW_DISPUTE]: "Tranh chấp vắng mặt",
  [ReportReason.OTHER]: "Lý do khác",
};

// ─── CharityAccountVerificationStatus ─────────────────────────────────────────

export enum CharityAccountVerificationStatus {
  UNVERIFIED = "UNVERIFIED",
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  FAILED = "FAILED",
}

export const CharityAccountVerificationStatusLabels: Record<
  CharityAccountVerificationStatus,
  string
> = {
  [CharityAccountVerificationStatus.UNVERIFIED]: "Chưa xác thực",
  [CharityAccountVerificationStatus.PENDING]: "Đang chờ xác thực",
  [CharityAccountVerificationStatus.VERIFIED]: "Đã xác thực",
  [CharityAccountVerificationStatus.FAILED]: "Xác thực thất bại",
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const ACTIVATION_AMOUNT = 10000; // fallback, real value from SystemConfig
export const CHARITY_ACCOUNT_VERIFICATION_AMOUNT = 1000; // 1,000 VND probe transfer
export const PAYMENT_EXPIRY_HOURS = 24;
export const LATE_CANCEL_THRESHOLD_MINUTES = 30;
export const MIN_ADVANCE_BOOKING_HOURS = 1;
export const MAX_ACTIVE_BOOKINGS = 1;
export const VALID_DURATION_HOURS = [1, 2, 3];

// Default TN App account (fallback khi chưa có CharityAccount trong DB)
export const DEFAULT_TN_ACTIVATION_ACCOUNT = process.env.TN_ACTIVATION_ACCOUNT_NO ?? "2000";
export const DEFAULT_TN_ACTIVATION_ACCOUNT_NAME = process.env.TN_ACTIVATION_ACCOUNT_NAME ?? "QUY THIEN NGUYEN";
