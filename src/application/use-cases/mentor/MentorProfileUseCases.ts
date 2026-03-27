import { IUnitOfWork } from "../../interfaces/IUnitOfWork";

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface UpdateMentorProfileDTO {
  userId: string;
  headline?: string;
  expertise?: string;
  experience?: number;
  hourlyRate?: number;
  charityAccountId?: string | null;
  onlyActivatedMentee?: boolean;
  isAvailable?: boolean;
  // Legacy TN account fields (backward compat)
  tnAccountNo?: string;
  tnAccountName?: string;
  tnCampaignKeyword?: string;
  updatedBy?: string;
}

export interface SetTeachingFieldsDTO {
  userId: string;
  fieldIds: string[];
  updatedBy?: string;
}

export interface MentorPublicProfileResult {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    lateCancellationCount: number;
  };
  profile: {
    headline: string | null;
    expertise: string | null;
    experience: number | null;
    hourlyRate: number | null;
    isAvailable: boolean;
    totalSessions: number;
    rating: number;
    ratingCount: number;
    onlyActivatedMentee: boolean;
    charityAccount: { name: string; accountNo: string } | null;
  };
  teachingFields: { id: string; name: string; icon: string | null }[];
  availabilitySlots: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
  }[];
}

// ─── UpdateMentorProfileUseCase ───────────────────────────────────────────────

export class UpdateMentorProfileUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: UpdateMentorProfileDTO): Promise<void> {
    const user = await this.uow.users.findById(input.userId);
    if (!user) throw new Error("Không tìm thấy người dùng");
    if (!user.isMentor() && !user.isAdmin()) {
      throw new Error("Chỉ Mentor mới có thể cập nhật hồ sơ này");
    }

    // Validate charityAccountId nếu được cung cấp
    if (input.charityAccountId) {
      const account = await this.uow.charityAccounts.findById(input.charityAccountId);
      if (!account || !account.isActive) {
        throw new Error("Tài khoản thiện nguyện không hợp lệ hoặc đã bị vô hiệu hóa");
      }
    }

    // Cập nhật thông qua Prisma (profile có thể chưa tồn tại)
    // Use case này dùng uow.execute để đảm bảo consistency
    await this.uow.users.createAuditLog({
      userId: input.userId,
      action: "MENTOR_PROFILE_UPDATED",
      newValues: {
        headline: input.headline,
        expertise: input.expertise,
        hourlyRate: input.hourlyRate,
        charityAccountId: input.charityAccountId,
      },
      performedBy: input.updatedBy ?? input.userId,
    });
    // Note: Actual profile update is done by the API route using Prisma directly
    // to support upsert (create or update MentorProfile)
  }
}

// ─── SetTeachingFieldsUseCase ─────────────────────────────────────────────────

export class SetTeachingFieldsUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: SetTeachingFieldsDTO): Promise<void> {
    const user = await this.uow.users.findById(input.userId);
    if (!user) throw new Error("Không tìm thấy người dùng");
    if (!user.isMentor() && !user.isAdmin()) {
      throw new Error("Chỉ Mentor mới có thể cập nhật môn học");
    }

    // Validate all field IDs exist
    for (const fieldId of input.fieldIds) {
      const field = await this.uow.teachingFields.findById(fieldId);
      if (!field || !field.isActive) {
        throw new Error(`Môn học không hợp lệ: ${fieldId}`);
      }
    }

    // Get mentor profile to find mentorProfileId
    // (API route handles the actual setMentorFields call with profileId)
    await this.uow.users.createAuditLog({
      userId: input.userId,
      action: "MENTOR_TEACHING_FIELDS_UPDATED",
      newValues: { fieldIds: input.fieldIds },
      performedBy: input.updatedBy ?? input.userId,
    });
  }
}
