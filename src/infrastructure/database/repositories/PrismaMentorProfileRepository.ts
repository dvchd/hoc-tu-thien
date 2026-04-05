import { PrismaClient } from "@prisma/client";
import { IMentorProfileRepository, MentorProfileRecord, AvailabilitySlotRecord } from "../../../domain/repositories/IMentorProfileRepository";

type PrismaTransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class PrismaMentorProfileRepository implements IMentorProfileRepository {
  constructor(private readonly prisma: PrismaClient | PrismaTransactionClient) {}

  private mapToRecord(profile: any): MentorProfileRecord {
    return {
      id: profile.id,
      userId: profile.userId,
      bio: profile.expertise,  // schema field 'expertise' maps to domain 'bio'
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
    // Map bio -> expertise for schema
    const { isActive, bio, ...rest } = data;
    const createData: any = { ...rest };
    if (isActive !== undefined) createData.isAvailable = isActive;
    if (bio !== undefined) createData.expertise = bio;

    const profile = await this.prisma.mentorProfile.create({
      data: createData,
      include: this.includeAll,
    });
    return this.mapToRecord(profile);
  }

  async update(id: string, data: Partial<MentorProfileRecord>): Promise<MentorProfileRecord> {
    const { user, charityAccount, teachingFields, availabilitySlots, totalSessions, averageRating, ratingCount, isActive, bio, ...rest } = data as any;
    const updateData: any = { ...rest };
    if (isActive !== undefined) {
      updateData.isAvailable = isActive;
    }
    if (bio !== undefined) {
      updateData.expertise = bio;
    }

    const profile = await this.prisma.mentorProfile.update({
      where: { id },
      data: updateData,
      include: this.includeAll,
    });
    return this.mapToRecord(profile);
  }

  async incrementTotalSessions(mentorUserId: string): Promise<void> {
    await this.prisma.mentorProfile.updateMany({
      where: { userId: mentorUserId },
      data: { totalSessions: { increment: 1 } },
    });
  }

  async updateRatingStats(mentorUserId: string, newRating: number): Promise<void> {
    const profile = await this.prisma.mentorProfile.findUnique({
      where: { userId: mentorUserId },
      select: { id: true, rating: true, ratingCount: true },
    });
    if (!profile) return;

    const currentCount = profile.ratingCount ?? 0;
    const currentRating = Number(profile.rating ?? 0);
    const newCount = currentCount + 1;
    // Tính lại trung bình cộng dồn
    const newAverage = (currentRating * currentCount + newRating) / newCount;

    await this.prisma.mentorProfile.update({
      where: { id: profile.id },
      data: {
        rating: newAverage,
        ratingCount: newCount,
      },
    });
  }
}
