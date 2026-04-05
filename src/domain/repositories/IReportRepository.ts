// ─── ReportRecord ─────────────────────────────────────────────────────────────

export interface ReportRecord {
  id: string;
  reporterId: string;
  reportedUserId: string;
  sessionId: string | null;
  reason: string;
  description: string;
  status: string; // PENDING | REVIEWED | RESOLVED | DISMISSED
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  // Joined info
  reporter?: { id: string; name: string | null; email: string; image: string | null };
  reportedUser?: { id: string; name: string | null; email: string; image: string | null };
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface CreateReportInput {
  id: string;
  reporterId: string;
  reportedUserId: string;
  sessionId?: string;
  reason: string;
  description: string;
}

export interface FindReportsOptions {
  status?: string;
  page?: number;
  pageSize?: number;
}

// ─── IReportRepository ────────────────────────────────────────────────────────

export interface IReportRepository {
  findById(id: string): Promise<ReportRecord | null>;
  findAll(options?: FindReportsOptions): Promise<{ reports: ReportRecord[]; total: number }>;
  create(input: CreateReportInput): Promise<ReportRecord>;
  updateStatus(
    id: string,
    status: string,
    reviewedBy: string,
    reviewNote?: string
  ): Promise<ReportRecord>;
}
