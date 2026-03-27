import { IUserRepository } from "./IUserRepository";

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
    bankName: string;
  } | null;
  teachingFields?: {
    id: string;
    field: {
      id: string;
      name: string;
    };
  }[];
  totalSessions?: number;
  averageRating?: number | null;
}

export interface IMentorProfileRepository {
  findById(id: string): Promise<MentorProfileRecord | null>;
  findByUserId(userId: string): Promise<MentorProfileRecord | null>;
  findAll(filters?: { isActive?: boolean }): Promise<MentorProfileRecord[]>;
  create(data: Omit<MentorProfileRecord, "id" | "createdAt" | "updatedAt" | "user" | "charityAccount" | "teachingFields" | "totalSessions" | "averageRating">): Promise<MentorProfileRecord>;
  update(id: string, data: Partial<MentorProfileRecord>): Promise<MentorProfileRecord>;
}
