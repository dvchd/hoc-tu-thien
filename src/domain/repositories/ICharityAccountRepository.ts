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
}
