import { PaymentStatus, PaymentType } from "../value-objects/Payment";

// ─── IPaymentRepository ───────────────────────────────────────────────────────

export interface CreatePaymentInput {
  id: string;
  userId: string;
  sessionId?: string;
  type: PaymentType;
  amount: number;
  transactionCode: string;
  shortCode: string;
  tnAccountNo: string;
  tnAccountName?: string;
  expiresAt: Date;
}

export interface IPaymentRepository {
  findById(id: string): Promise<PaymentRecord | null>;
  findByShortCode(shortCode: string): Promise<PaymentRecord | null>;
  findPendingByUserId(userId: string, type?: PaymentType): Promise<PaymentRecord[]>;
  findByUserId(userId: string, limit?: number): Promise<PaymentRecord[]>;

  create(input: CreatePaymentInput): Promise<PaymentRecord>;
  updateStatus(
    id: string,
    status: PaymentStatus,
    opts?: {
      tnTransactionId?: string;
      tnRefId?: string;
      verifiedAmount?: number;
      verifiedBy?: string;
    }
  ): Promise<PaymentRecord>;
  incrementCheckCount(id: string, lastCheckedAt: Date): Promise<void>;
  logVerification(log: {
    paymentId: string;
    found: boolean;
    apiResponse?: string;
    error?: string;
  }): Promise<void>;
}

// ─── PaymentRecord (infra DTO) ────────────────────────────────────────────────

export interface PaymentRecord {
  id: string;
  userId: string;
  sessionId: string | null;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  transactionCode: string;
  shortCode: string;
  tnAccountNo: string;
  tnAccountName: string | null;
  tnTransactionId: string | null;
  tnRefId: string | null;
  verifiedAt: Date | null;
  verifiedAmount: number | null;
  verifiedBy: string | null;
  expiresAt: Date;
  lastCheckedAt: Date | null;
  checkCount: number;
  createdAt: Date;
  updatedAt: Date;
}
