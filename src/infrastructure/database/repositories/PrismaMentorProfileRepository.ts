import { PrismaClient } from "@prisma/client";
import { IMentorProfileRepository, MentorProfileRecord, AvailabilitySlotRecord } from "../../../domain/repositories/IMentorProfileRepository";

export class PrismaMentorProfileRepository implements IMentorProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToRecord(profile: any): MentorProfileRecord {
    return {
      id: profile.id,
      userId: profile.userId,
      bio: profile.bio,
      experience: profile.experience,
      headline: profile.headline,
      hourlyRate: Number(profile.hourlyRate ?? 0),
      charityAccountId: profile.charityAccountId,
      onlyActivatedMentee: profile.onlyActivatedMentee ?? false,
      isActive: profile.isAvailable ?? profile.isActive ?? true,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      user: profile.user,
      charityAccount: profile.charityAccount
        ? {
            id: profile.charityAccount.id,
            name: profile.charityAccount.name,
            accountNo: profile.charityAccount.accountNo,
            bankName: profile.charityAccount.bankName,
          }
        : null,
      teachingFields: profile.teachingFields?.map((tf: any) => ({
        id: tf.id,
        field: {
          id: tf.teachingField?.id ?? tf.id,
          name: tf.teachingField?.name ?? "",
          icon: tf.teachingField?.icon ?? null,
        },
      })),
      availabilitySlots: profile.availabilitySlots?.map((s: any): AvailabilitySlotRecord => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isRecurring: s.isRecurring,
      })),
      totalSessions: profile.totalSessions ?? 0,
      averageRating: profile.rating ?? null,
      ratingCount: profile.ratingCount ?? 0,
    };
  }

  private readonly includeAll = {
    user: { select: { name: true, email: true, image: true } },
    charityAccount: true,
    teachingFields: { include: { teachingField: true } },
    availabilitySlots: { orderBy: { dayOfWeek: "asc" as const } },
  } as const;

  async findById(id: string): Promise<MentorProfileRecord | null> {
    const profile = await this.prisma.mentorProfile.findUnique({
      where: { id },
      include: this.includeAll,
    });
    return profile ? this.mapToRecord(profile) : null;
  }

  async findByUserId(userId: string): Promise<MentorProfileRecord | null> {
    const profile = await this.prisma.mentorProfile.findUnique({
      where: { userId },
      include: this.includeAll,
    });
    return profile ? this.mapToRecord(profile) : null;
  }

  async findAll(filters?: { isActive?: boolean }): Promise<MentorProfileRecord[]> {
    const where: any = {};
    if (filters?.isActive !== undefined) {
      where.isAvailable = filters.isActive;
    }

    const profiles = await this.prisma.mentorProfile.findMany({
      where,
      include: this.includeAll,
    });
    return profiles.map(p => this.mapToRecord(p));
  }

  async create(data: any): Promise<MentorProfileRecord> {
    // Map isActive -> isAvailable for schema
    const { isActive, ...rest } = data;
    const createData: any = { ...rest };
    if (isActive !== undefined) createData.isAvailable = isActive;

    const profile = await this.prisma.mentorProfile.create({
      data: createData,
      include: this.includeAll,
    });
    return this.mapToRecord(profile);
  }

  async update(id: string, data: Partial<MentorProfileRecord>): Promise<MentorProfileRecord> {
    const { user, charityAccount, teachingFields, availabilitySlots, totalSessions, averageRating, ratingCount, isActive, ...rest } = data as any;
    const updateData: any = { ...rest };
    if (isActive !== undefined) {
      updateData.isAvailable = isActive;
    }

    const profile = await this.prisma.mentorProfile.update({
      where: { id },
      data: updateData,
      include: this.includeAll,
    });
    return this.mapToRecord(profile);
  }
}
