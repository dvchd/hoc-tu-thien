import { SessionStatus } from "../value-objects/Payment";

// ─── MentorProfileFee ─────────────────────────────────────────────────────────

export interface MentorProfileFee {
  hourlyRate: number | null;
  tnAccountNo: string | null;
  tnAccountName: string | null;
  tnCampaignKeyword: string | null;
  charityAccountId: string | null;
}

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
  mentorConfirmed: boolean;
  menteeConfirmed: boolean;
  isLateCancellation: boolean;
  isNoShow: boolean;
  noShowMarkedBy: string | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

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

// ─── ISessionRepository ────────────────────────────────────────────────────────

export interface ISessionRepository {
  // Queries
  findById(id: string): Promise<SessionRecord | null>;
  findByMenteeId(menteeId: string, limit?: number): Promise<SessionRecord[]>;
  findByMentorId(mentorId: string, limit?: number): Promise<SessionRecord[]>;
  findUpcomingByMentorId(mentorId: string): Promise<SessionRecord[]>;
  findPendingPaymentByMenteeId(menteeId: string): Promise<SessionRecord | null>;
  findActiveByMenteeId(menteeId: string): Promise<SessionRecord[]>;
  countActiveByMenteeId(menteeId: string): Promise<number>;
  findConflictingSession(
    mentorId: string,
    scheduledAt: Date,
    durationMinutes: number,
    excludeSessionId?: string
  ): Promise<SessionRecord | null>;
  getMentorProfileFee(mentorUserId: string): Promise<MentorProfileFee | null>;

  // Commands
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
      isLateCancellation?: boolean;
      isNoShow?: boolean;
      noShowMarkedBy?: string;
    }
  ): Promise<SessionRecord>;
  updateConfirmation(
    id: string,
    confirmedBy: "mentor" | "mentee",
    opts?: { meetLink?: string }
  ): Promise<SessionRecord>;
  addRating(id: string, rating: number, comment?: string): Promise<SessionRecord>;

  // Leaderboard
  getTopMentors(month: number, year: number, limit?: number): Promise<LeaderboardEntry[]>;
  getTopMentees(month: number, year: number, limit?: number): Promise<LeaderboardEntry[]>;

  // Stats
  getMenteeStats(menteeId: string): Promise<MenteeStats>;
  getMentorStats(mentorId: string): Promise<MentorStats>;
}

export interface LeaderboardEntry {
  userId: string;
  name: string | null;
  image: string | null;
  sessionCount: number;
  totalAmount: number;
}

export interface MenteeStats {
  totalSessions: number;
  totalHours: number;
  totalDonated: number;
  avgRatingGiven: number | null;
  noShowCount: number;
  lateCancellationCount: number;
}

export interface MentorStats {
  totalSessions: number;
  totalMentees: number;
  totalDonations: number;
  totalHours: number;
  avgRating: number | null;
  ratingCount: number;
  lateCancellationCount: number;
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
