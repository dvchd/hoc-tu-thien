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

export interface UpdateMentorApplicationContentInput {
  motivation: string;
  experience: string;
  linkedinUrl?: string;
  contactInfo?: string;
}

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
  /** Cu1eadp nhu1eadt nu1ed9i dung u0111u01a1n vu00e0 reset status vu1ec1 PENDING (du00f9ng khi nu1ed9p lu1ea1i sau khi bu1ecb tu1eeb chu1ed1i) */
  resubmit(id: string, input: UpdateMentorApplicationContentInput): Promise<MentorApplicationRecord>;
}
