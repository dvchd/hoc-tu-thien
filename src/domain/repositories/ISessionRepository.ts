import { SessionStatus } from "../value-objects/Payment";

// ─── SessionRecord ─────────────────────────────────────────────────────────────

export interface SessionRecord {
  id: string;
  menteeId: string;
  mentorId: string;
  teachingFieldId: string | null;
  title: string;
  description: string | null;
  status: SessionStatus;
  scheduledAt: Date;
  durationMinutes: number;
  endAt: Date | null;
  meetLink: string | null;
  meetId: string | null;
  fee: number;
  notes: string | null;
  mentorNotes: string | null;
  rating: number | null;
  ratingComment: string | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// ─── ISessionRepository ────────────────────────────────────────────────────────

export interface BookSessionInput {
  id: string;
  menteeId: string;
  mentorId: string;
  teachingFieldId?: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  durationMinutes: number;
  fee: number;
  notes?: string;
  createdBy: string;
}

export interface ISessionRepository {
  findById(id: string): Promise<SessionRecord | null>;
  findByMenteeId(menteeId: string, limit?: number): Promise<SessionRecord[]>;
  findByMentorId(mentorId: string, limit?: number): Promise<SessionRecord[]>;
  findUpcomingByMentorId(mentorId: string): Promise<SessionRecord[]>;
  findPendingPaymentByMenteeId(menteeId: string): Promise<SessionRecord | null>;

  create(input: BookSessionInput): Promise<SessionRecord>;
  updateStatus(
    id: string,
    status: SessionStatus,
    opts?: {
      meetLink?: string;
      meetId?: string;
      mentorNotes?: string;
      cancelReason?: string;
      cancelledBy?: string;
    }
  ): Promise<SessionRecord>;
  addRating(id: string, rating: number, comment?: string): Promise<SessionRecord>;

  // Leaderboard
  getTopMentors(month: number, year: number, limit?: number): Promise<LeaderboardEntry[]>;
  getTopMentees(month: number, year: number, limit?: number): Promise<LeaderboardEntry[]>;
}

export interface LeaderboardEntry {
  userId: string;
  name: string | null;
  image: string | null;
  sessionCount: number;
  totalAmount: number;
}

// ─── ITeachingFieldRepository ──────────────────────────────────────────────────

export interface TeachingFieldRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ITeachingFieldRepository {
  findAll(): Promise<TeachingFieldRecord[]>;
  findById(id: string): Promise<TeachingFieldRecord | null>;
  findByMentorId(mentorProfileId: string): Promise<TeachingFieldRecord[]>;
  create(input: Omit<TeachingFieldRecord, "id">): Promise<TeachingFieldRecord>;
  update(id: string, data: Partial<TeachingFieldRecord>): Promise<TeachingFieldRecord>;
  softDelete(id: string): Promise<void>;

  setMentorFields(mentorProfileId: string, fieldIds: string[]): Promise<void>;
}
