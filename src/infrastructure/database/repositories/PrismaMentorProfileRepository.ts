import { PrismaClient } from "@prisma/client";
import { IMentorProfileRepository, MentorProfileRecord } from "../../../domain/repositories/IMentorProfileRepository";

export class PrismaMentorProfileRepository implements IMentorProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToRecord(profile: any): MentorProfileRecord {
    return {
      id: profile.id,
      userId: profile.userId,
      bio: profile.bio,
      experience: profile.experience,
      headline: profile.headline,
      hourlyRate: Number(profile.hourlyRate),
      charityAccountId: profile.charityAccountId,
      onlyActivatedMentee: profile.onlyActivatedMentee,
      isActive: profile.isActive,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      user: profile.user,
      charityAccount: profile.charityAccount,
      teachingFields: profile.teachingFields?.map((tf: any) => ({
        id: tf.id,
        field: tf.teachingField
      })),
      totalSessions: profile.totalSessions,
      averageRating: profile.rating
    };
  }

  async findById(id: string): Promise<MentorProfileRecord | null> {
    const profile = await this.prisma.mentorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, image: true } },
        charityAccount: true,
        teachingFields: { include: { teachingField: true } },
      }
    });
    return profile ? this.mapToRecord(profile) : null;
  }

  async findByUserId(userId: string): Promise<MentorProfileRecord | null> {
    const profile = await this.prisma.mentorProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true, email: true, image: true } },
        charityAccount: true,
        teachingFields: { include: { teachingField: true } },
      }
    });
    return profile ? this.mapToRecord(profile) : null;
  }

  async findAll(filters?: { isActive?: boolean }): Promise<MentorProfileRecord[]> {
    const { isActive, ...rest } = filters || {};
    const profileFilters: any = rest;
    if (isActive !== undefined) {
      profileFilters.isAvailable = isActive; // Mapping isActive to isAvailable in schema
    }

    const profiles = await this.prisma.mentorProfile.findMany({
      where: profileFilters,
      include: {
        user: { select: { name: true, email: true, image: true } },
        charityAccount: true,
        teachingFields: { include: { teachingField: true } },
      }
    });
    return profiles.map(p => this.mapToRecord(p));
  }

  async create(data: any): Promise<MentorProfileRecord> {
    const profile = await this.prisma.mentorProfile.create({
      data,
      include: {
        user: { select: { name: true, email: true, image: true } },
        charityAccount: true,
        teachingFields: { include: { teachingField: true } },
      }
    });
    return this.mapToRecord(profile);
  }

  async update(id: string, data: Partial<MentorProfileRecord>): Promise<MentorProfileRecord> {
    const { user, charityAccount, teachingFields, totalSessions, averageRating, isActive, ...rest } = data as any;
    const updateData = { ...rest };
    if (isActive !== undefined) {
      updateData.isAvailable = isActive;
    }

    const profile = await this.prisma.mentorProfile.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { name: true, email: true, image: true } },
        charityAccount: true,
        teachingFields: { include: { teachingField: true } },
      }
    });
    return this.mapToRecord(profile);
  }
}
