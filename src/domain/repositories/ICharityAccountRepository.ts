// ─── CharityAccountRecord ─────────────────────────────────────────────────────

export interface CharityAccountRecord {
  id: string;
  name: string;
  accountNo: string;
  bankName: string;
  campaignKeyword: string | null;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  // ─── Verification fields ──────────────────────────────────────────────
  verificationStatus: string;       // UNVERIFIED | PENDING | VERIFIED | FAILED
  verificationPaymentId: string | null; // Payment.id của probe transfer
  verificationShortCode: string | null; // short code của giao dịch xác thực
  verifiedAt: Date | null;
  verifiedBy: string | null;        // adminId người trigger xác thực
  verificationNote: string | null;  // ghi chú khi failed
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface CreateCharityAccountInput {
  name: string;
  accountNo: string;
  bankName?: string;
  campaignKeyword?: string;
  description?: string;
  isDefault?: boolean;
  createdBy?: string;
}

export interface UpdateCharityAccountInput {
  name?: string;
  bankName?: string;
  campaignKeyword?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

// ─── ICharityAccountRepository ────────────────────────────────────────────────

export interface ICharityAccountRepository {
  findById(id: string): Promise<CharityAccountRecord | null>;
  findByAccountNo(accountNo: string): Promise<CharityAccountRecord | null>;
  findAll(options?: {
    isActive?: boolean;
    includeDeleted?: boolean;
  }): Promise<CharityAccountRecord[]>;
  findDefault(): Promise<CharityAccountRecord | null>;
  create(input: CreateCharityAccountInput): Promise<CharityAccountRecord>;
  update(id: string, input: UpdateCharityAccountInput): Promise<CharityAccountRecord>;
  deactivate(id: string): Promise<void>;
  delete(id: string): Promise<void>; // hard delete, chỉ khi usageCount = 0
  getUsageCount(id: string): Promise<number>;
  clearDefault(): Promise<void>; // bỏ isDefault trên tất cả accounts
  /** Cập nhật trạng thái xác thực tài khoản sau khi probe transfer hoàn tất */
  updateVerificationStatus(
    id: string,
    status: string,
    opts?: {
      verificationPaymentId?: string;
      verificationShortCode?: string;
      verifiedAt?: Date;
      verifiedBy?: string;
      verificationNote?: string;
    }
  ): Promise<CharityAccountRecord>;
}
