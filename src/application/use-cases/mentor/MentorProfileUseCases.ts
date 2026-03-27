// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createId } = require("@paralleldrive/cuid2");
import { IUnitOfWork } from "../../interfaces/IUnitOfWork";

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface UpdateMentorProfileDTO {
  userId: string;
  headline?: string;
  expertise?: string;    // maps to bio in DB
  experience?: number;
  hourlyRate?: number;
  charityAccountId?: string | null;
  onlyActivatedMentee?: boolean;
  isAvailable?: boolean; // maps to isActive in profile
  // Legacy TN account fields (backward compat, used when charityAccountId not set)
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

// ─── GetMentorPublicProfileUseCase ────────────────────────────────────────────

export class GetMentorPublicProfileUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  /**
   * Lấy hồ sơ công khai của mentor.
   * @param mentorUserId - userId của mentor (không phải profileId)
   */
  async execute(mentorUserId: string): Promise<MentorPublicProfileResult> {
    const user = await this.uow.users.findById(mentorUserId);
    if (!user) throw new Error("Không tìm thấy người dùng");
    if (!user.isMentor() && !user.isAdmin()) {
      throw new Error("Người dùng này không phải là Mentor");
    }

    const profile = await this.uow.mentorProfiles.findByUserId(mentorUserId);
    if (!profile) throw new Error("Mentor chưa thiết lập hồ sơ");

    const charityAccount = profile.charityAccount
      ? { name: profile.charityAccount.name, accountNo: profile.charityAccount.accountNo }
      : null;

    const availabilitySlots = (profile.availabilitySlots ?? []).map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      isRecurring: s.isRecurring,
    }));

    return {
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
        lateCancellationCount: (user as any).lateCancellationCount ?? 0,
      },
      profile: {
        headline: profile.headline,
        expertise: profile.bio,
        experience: typeof profile.experience === "string"
          ? parseInt(profile.experience) || null
          : (profile.experience as number | null),
        hourlyRate: profile.hourlyRate,
        isAvailable: profile.isActive,
        totalSessions: profile.totalSessions ?? 0,
        rating: profile.averageRating ?? 0,
        ratingCount: profile.ratingCount ?? 0,
        onlyActivatedMentee: profile.onlyActivatedMentee,
        charityAccount,
      },
      teachingFields: (profile.teachingFields ?? []).map((tf) => ({
        id: tf.field.id,
        name: tf.field.name,
        icon: tf.field.icon ?? null,
      })),
      availabilitySlots,
    };
  }
}

// ─── UpdateMentorProfileUseCase ───────────────────────────────────────────────

export interface UpdateMentorProfileResult {
  profileId: string;
  created: boolean;
}

export class UpdateMentorProfileUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: UpdateMentorProfileDTO): Promise<UpdateMentorProfileResult> {
    const user = await this.uow.users.findById(input.userId);
    if (!user) throw new Error("Không tìm thấy người dùng");
    if (!user.isMentor() && !user.isAdmin()) {
      throw new Error("Chỉ Mentor mới có thể cập nhật hồ sơ này");
    }

    // Validate charityAccountId nếu được cung cấp (BR08)
    if (input.charityAccountId) {
      const account = await this.uow.charityAccounts.findById(input.charityAccountId);
      if (!account || !account.isActive) {
        throw new Error("Tài khoản thiện nguyện không hợp lệ hoặc đã bị vô hiệu hóa");
      }
    }

    // Lấy old values để audit
    const existing = await this.uow.mentorProfiles.findByUserId(input.userId);

    let profileId: string;
    let created = false;

    if (!existing) {
      // Tạo mới MentorProfile
      const newProfile = await this.uow.mentorProfiles.create({
        userId: input.userId,
        bio: input.expertise ?? null,
        experience: input.experience != null ? String(input.experience) : null,
        headline: input.headline ?? null,
        hourlyRate: input.hourlyRate ?? 0,
        charityAccountId: input.charityAccountId ?? null,
        onlyActivatedMentee: input.onlyActivatedMentee ?? false,
        isActive: input.isAvailable ?? true,
      });
      profileId = newProfile.id;
      created = true;
    } else {
      // Cập nhật profile hiện có
      const updateData: Record<string, unknown> = {};
      if (input.headline !== undefined) updateData.headline = input.headline;
      if (input.expertise !== undefined) updateData.bio = input.expertise;
      if (input.experience !== undefined) updateData.experience = String(input.experience);
      if (input.hourlyRate !== undefined) updateData.hourlyRate = input.hourlyRate;
      if (input.charityAccountId !== undefined) updateData.charityAccountId = input.charityAccountId;
      if (input.onlyActivatedMentee !== undefined) updateData.onlyActivatedMentee = input.onlyActivatedMentee;
      if (input.isAvailable !== undefined) updateData.isActive = input.isAvailable;
      // Legacy TN fields (backward compat)
      if (input.tnAccountNo !== undefined) updateData.tnAccountNo = input.tnAccountNo;
      if (input.tnAccountName !== undefined) updateData.tnAccountName = input.tnAccountName;
      if (input.tnCampaignKeyword !== undefined) updateData.tnCampaignKeyword = input.tnCampaignKeyword;

      await this.uow.mentorProfiles.update(existing.id, updateData as any);
      profileId = existing.id;
    }

    await this.uow.users.createAuditLog({
      userId: input.userId,
      action: created ? "MENTOR_PROFILE_CREATED" : "MENTOR_PROFILE_UPDATED",
      oldValues: existing
        ? {
            headline: existing.headline,
            hourlyRate: existing.hourlyRate,
            charityAccountId: existing.charityAccountId,
          }
        : undefined,
      newValues: {
        headline: input.headline,
        expertise: input.expertise,
        hourlyRate: input.hourlyRate,
        charityAccountId: input.charityAccountId,
      },
      performedBy: input.updatedBy ?? input.userId,
    });

    return { profileId, created };
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

    const profile = await this.uow.mentorProfiles.findByUserId(input.userId);
    if (!profile) throw new Error("Mentor chưa thiết lập hồ sơ");

    // Validate all field IDs exist và active
    for (const fieldId of input.fieldIds) {
      const field = await this.uow.teachingFields.findById(fieldId);
      if (!field || !field.isActive) {
        throw new Error(`Môn học không hợp lệ hoặc đã bị ẩn: ${fieldId}`);
      }
    }

    // Set teaching fields (replace existing)
    await this.uow.teachingFields.setMentorFields(profile.id, input.fieldIds);

    await this.uow.users.createAuditLog({
      userId: input.userId,
      action: "MENTOR_TEACHING_FIELDS_UPDATED",
      newValues: { fieldIds: input.fieldIds, profileId: profile.id },
      performedBy: input.updatedBy ?? input.userId,
    });
  }
}
