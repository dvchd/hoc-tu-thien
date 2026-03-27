export interface AvailabilitySlotRecord {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

export interface MentorProfileRecord {
  id: string;
  userId: string;
  bio: string | null;
  experience: string | null;
  headline: string | null;
  hourlyRate: number;
  charityAccountId: string | null;
  onlyActivatedMentee: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  charityAccount?: {
    id: string;
    name: string;
    accountNo: string;
    bankName: string;
  } | null;
  teachingFields?: {
    id: string;
    field: {
      id: string;
      name: string;
      icon?: string | null;
    };
  }[];
  availabilitySlots?: AvailabilitySlotRecord[];
  totalSessions?: number;
  averageRating?: number | null;
  ratingCount?: number;
}

export interface IMentorProfileRepository {
  findById(id: string): Promise<MentorProfileRecord | null>;
  findByUserId(userId: string): Promise<MentorProfileRecord | null>;
  findAll(filters?: { isActive?: boolean }): Promise<MentorProfileRecord[]>;
  create(data: Omit<MentorProfileRecord, "id" | "createdAt" | "updatedAt" | "user" | "charityAccount" | "teachingFields" | "totalSessions" | "averageRating">): Promise<MentorProfileRecord>;
  update(id: string, data: Partial<MentorProfileRecord>): Promise<MentorProfileRecord>;
  /** Tăng totalSessions lên 1 sau khi session hoàn thành */
  incrementTotalSessions(mentorUserId: string): Promise<void>;
  /** Cập nhật averageRating và ratingCount sau khi mentee đánh giá */
  updateRatingStats(mentorUserId: string, newRating: number): Promise<void>;
}
