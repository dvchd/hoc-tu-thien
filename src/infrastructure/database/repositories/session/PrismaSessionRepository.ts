import { PrismaClient } from "@prisma/client";
import {
  ISessionRepository,
  BookSessionInput,
  SessionRecord,
  LeaderboardEntry,
  MentorProfileFee,
  MenteeStats,
  MentorStats,
} from "../../../domain/repositories/ISessionRepository";
import { SessionStatus } from "../../../domain/value-objects/Payment";

type PrismaTransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaClient | PrismaTransactionClient) {}

  private toRecord(s: any): SessionRecord {
    return {
      ...s,
      status: s.status as SessionStatus,
    };
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const s = await this.prisma.learningSession.findUnique({ where: { id } });
    return s ? this.toRecord(s) : null;
  }

  async findByMenteeId(menteeId: string, limit = 50): Promise<SessionRecord[]> {
    const results = await this.prisma.learningSession.findMany({
      where: { menteeId },
      orderBy: { scheduledAt: "desc" },
      take: limit,
    });
    return results.map((s: any) => this.toRecord(s));
  }

  async findByMentorId(mentorId: string, limit = 50): Promise<SessionRecord[]> {
    const results = await this.prisma.learningSession.findMany({
      where: { mentorId },
      orderBy: { scheduledAt: "desc" },
      take: limit,
    });
    return results.map((s: any) => this.toRecord(s));
  }

  async findUpcomingByMentorId(mentorId: string): Promise<SessionRecord[]> {
    const results = await this.prisma.learningSession.findMany({
      where: {
        mentorId,
        scheduledAt: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      orderBy: { scheduledAt: "asc" },
    });
    return results.map((s: any) => this.toRecord(s));
  }

  async findPendingPaymentByMenteeId(menteeId: string): Promise<SessionRecord | null> {
    const s = await this.prisma.learningSession.findFirst({
      where: { menteeId, status: "PAYMENT_PENDING" },
    });
    return s ? this.toRecord(s) : null;
  }

  async findActiveByMenteeId(menteeId: string): Promise<SessionRecord[]> {
    const results = await this.prisma.learningSession.findMany({
      where: {
        menteeId,
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS", "PAYMENT_PENDING"] },
      },
    });
    return results.map((s: any) => this.toRecord(s));
  }

  async countActiveByMenteeId(menteeId: string): Promise<number> {
    return this.prisma.learningSession.count({
      where: {
        menteeId,
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS", "PAYMENT_PENDING"] },
      },
    });
  }

  async findConflictingSession(
    mentorId: string,
    scheduledAt: Date,
    durationMinutes: number,
    excludeSessionId?: string
  ): Promise<SessionRecord | null> {
    const endAt = new Date(scheduledAt.getTime() + durationMinutes * 60000);
    const conflict = await this.prisma.learningSession.findFirst({
      where: {
        mentorId,
        id: excludeSessionId ? { not: excludeSessionId } : undefined,
        status: { notIn: ["CANCELLED"] },
        OR: [
          { scheduledAt: { lt: endAt }, endAt: { gt: scheduledAt } },
        ],
      },
    });
    return conflict ? this.toRecord(conflict) : null;
  }

  async getMentorProfileFee(mentorUserId: string): Promise<MentorProfileFee | null> {
    const profile = await this.prisma.mentorProfile.findUnique({
      where: { userId: mentorUserId },
      select: {
        hourlyRate: true,
        tnAccountNo: true,
        tnAccountName: true,
        tnCampaignKeyword: true,
        charityAccountId: true,
      },
    });
    return profile as MentorProfileFee | null;
  }

  async create(input: BookSessionInput): Promise<SessionRecord> {
    const endAt = new Date(input.scheduledAt.getTime() + input.durationMinutes * 60000);
    const s = await this.prisma.learningSession.create({
      data: {
        id: input.id,
        menteeId: input.menteeId,
        mentorId: input.mentorId,
        teachingFieldId: input.teachingFieldId,
        title: input.title,
        description: input.description,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        endAt,
        fee: input.fee,
        notes: input.notes,
        status: "PENDING",
        version: 1,
      },
    });
    return this.toRecord(s);
  }

  async updateStatus(
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
  ): Promise<SessionRecord> {
    const s = await this.prisma.learningSession.update({
      where: { id },
      data: {
        status,
        meetLink: opts?.meetLink,
        meetId: opts?.meetId,
        mentorNotes: opts?.mentorNotes,
        cancelReason: opts?.cancelReason,
        cancelledBy: opts?.cancelledBy,
        cancelledAt: opts?.cancelledBy ? new Date() : undefined,
        isLateCancellation: opts?.isLateCancellation,
        isNoShow: opts?.isNoShow,
        noShowMarkedBy: opts?.noShowMarkedBy,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    return this.toRecord(s);
  }

  async updateConfirmation(
    id: string,
    confirmedBy: "mentor" | "mentee",
    opts?: { meetLink?: string }
  ): Promise<SessionRecord> {
    const data: any = {
      updatedAt: new Date(),
      version: { increment: 1 },
    };
    if (confirmedBy === "mentor") {
      data.mentorConfirmed = true;
      if (opts?.meetLink) data.meetLink = opts.meetLink;
    } else {
      data.menteeConfirmed = true;
    }

    const s = await this.prisma.learningSession.update({
      where: { id },
      data,
    });
    return this.toRecord(s);
  }

  async addRating(id: string, rating: number, comment?: string): Promise<SessionRecord> {
    const s = await this.prisma.learningSession.update({
      where: { id },
      data: {
        rating,
        ratingComment: comment,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    return this.toRecord(s);
  }

  async getTopMentors(month: number, year: number, limit = 10): Promise<LeaderboardEntry[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const result = await this.prisma.learningSession.groupBy({
      by: ["mentorId"],
      where: {
        status: "COMPLETED",
        scheduledAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
      _sum: { fee: true },
      orderBy: { _sum: { fee: "desc" } },
      take: limit,
    });

    const mentorIds = result.map((r) => r.mentorId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: mentorIds } },
      select: { id: true, name: true, image: true },
    });

    return result.map((r) => {
      const user = users.find((u) => u.id === r.mentorId);
      return {
        userId: r.mentorId,
        name: user?.name ?? "Unknown",
        image: user?.image ?? null,
        sessionCount: r._count.id,
        totalAmount: r._sum.fee ?? 0,
      };
    });
  }

  async getTopMentees(month: number, year: number, limit = 10): Promise<LeaderboardEntry[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const result = await this.prisma.learningSession.groupBy({
      by: ["menteeId"],
      where: {
        status: "COMPLETED",
        scheduledAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
      _sum: { fee: true },
      orderBy: { _sum: { fee: "desc" } },
      take: limit,
    });

    const menteeIds = result.map((r) => r.menteeId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: menteeIds } },
      select: { id: true, name: true, image: true },
    });

    return result.map((r) => {
      const user = users.find((u) => u.id === r.menteeId);
      return {
        userId: r.menteeId,
        name: user?.name ?? "Unknown",
        image: user?.image ?? null,
        sessionCount: r._count.id,
        totalAmount: r._sum.fee ?? 0,
      };
    });
  }

  async getMenteeStats(menteeId: string): Promise<MenteeStats> {
    const [sessions, user] = await Promise.all([
      this.prisma.learningSession.findMany({
        where: { menteeId, status: "COMPLETED" },
        select: { fee: true, durationMinutes: true },
      }),
      this.prisma.user.findUnique({
        where: { id: menteeId },
        select: { lateCancellationCount: true, menteeProfile: { select: { noShowCount: true } } },
      }),
    ]);

    const totalDonated = sessions.reduce((sum, s) => sum + s.fee, 0);
    const totalHours = sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;

    return {
      totalSessions: sessions.length,
      totalHours,
      totalDonated,
      avgRatingGiven: null,
      noShowCount: user?.menteeProfile?.noShowCount ?? 0,
      lateCancellationCount: user?.lateCancellationCount ?? 0,
    };
  }

  async getMentorStats(mentorId: string): Promise<MentorStats> {
    const [sessions, profile, user] = await Promise.all([
      this.prisma.learningSession.findMany({
        where: { mentorId, status: "COMPLETED" },
        select: { fee: true, durationMinutes: true, menteeId: true },
      }),
      this.prisma.mentorProfile.findUnique({
        where: { userId: mentorId },
        select: { rating: true, ratingCount: true },
      }),
      this.prisma.user.findUnique({
        where: { id: mentorId },
        select: { lateCancellationCount: true },
      }),
    ]);

    const totalDonations = sessions.reduce((sum, s) => sum + s.fee, 0);
    const totalHours = sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
    const uniqueMentees = new Set(sessions.map((s) => s.menteeId)).size;

    return {
      totalSessions: sessions.length,
      totalMentees: uniqueMentees,
      totalDonations,
      totalHours,
      avgRating: profile?.rating ?? null,
      ratingCount: profile?.ratingCount ?? 0,
      lateCancellationCount: user?.lateCancellationCount ?? 0,
    };
  }
}
