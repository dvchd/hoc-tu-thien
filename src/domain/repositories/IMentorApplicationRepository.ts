// ─── MentorApplicationRecord ──────────────────────────────────────────────────

export interface MentorApplicationRecord {
  id: string;
  userId: string;
  motivation: string;
  experience: string;
  linkedinUrl: string | null;
  contactInfo: string | null;
  status: string; // PENDING | APPROVED | REJECTED
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  // Joined user info
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface CreateMentorApplicationInput {
  id: string;
  userId: string;
  motivation: string;
  experience: string;
  linkedinUrl?: string;
  contactInfo?: string; // JSON string: { zalo?, facebook?, email? }
}

export interface FindMentorApplicationsOptions {
  status?: string;
  page?: number;
  pageSize?: number;
}

// ─── IMentorApplicationRepository ─────────────────────────────────────────────

export interface IMentorApplicationRepository {
  findById(id: string): Promise<MentorApplicationRecord | null>;
  findByUserId(userId: string): Promise<MentorApplicationRecord | null>;
  findAll(options?: FindMentorApplicationsOptions): Promise<{
    applications: MentorApplicationRecord[];
    total: number;
  }>;
  create(input: CreateMentorApplicationInput): Promise<MentorApplicationRecord>;
  updateStatus(
    id: string,
    status: string,
    reviewedBy: string,
    reviewNote?: string
  ): Promise<MentorApplicationRecord>;
}
