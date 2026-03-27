import { PrismaClient } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";
import {
  IPaymentRepository,
  CreatePaymentInput,
  PaymentRecord,
} from "../../../domain/repositories/IPaymentRepository";
import {
  ISessionRepository,
  ITeachingFieldRepository,
  BookSessionInput,
  SessionRecord,
  TeachingFieldRecord,
  LeaderboardEntry,
  MentorProfileFee,
} from "../../../domain/repositories/ISessionRepository";
import { PaymentStatus, PaymentType, SessionStatus } from "../../../domain/value-objects/Payment";

type PrismaTransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// ─── PrismaPaymentRepository ──────────────────────────────────────────────────

export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaClient | PrismaTransactionClient) {}

  private toRecord(p: any): PaymentRecord {
    return {
      ...p,
      type: p.type as PaymentType,
      status: p.status as PaymentStatus,
    };
  }

  async findById(id: string): Promise<PaymentRecord | null> {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    return p ? this.toRecord(p) : null;
  }

  async findByShortCode(shortCode: string): Promise<PaymentRecord | null> {
    const p = await this.prisma.payment.findFirst({ where: { shortCode } });
    return p ? this.toRecord(p) : null;
  }

  async findPendingByUserId(
    userId: string,
    type?: PaymentType
  ): Promise<PaymentRecord[]> {
    const where: any = { userId, status: "PENDING" };
    if (type) where.type = type;
    const results = await this.prisma.payment.findMany({ where });
    return results.map(this.toRecord);
  }

  async findByUserId(userId: string, limit = 20): Promise<PaymentRecord[]> {
    const results = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return results.map(this.toRecord);
  }

  async create(input: CreatePaymentInput): Promise<PaymentRecord> {
    const created = await this.prisma.payment.create({
      data: {
        id: input.id,
        userId: input.userId,
        sessionId: input.sessionId ?? null,
        type: input.type,
        status: "PENDING",
        amount: input.amount,
        transactionCode: input.transactionCode,
        shortCode: input.shortCode,
        tnAccountNo: input.tnAccountNo,
        tnAccountName: input.tnAccountName ?? null,
        expiresAt: input.expiresAt,
      },
    });
    return this.toRecord(created);
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    opts?: {
      tnTransactionId?: string;
      tnRefId?: string;
      verifiedAmount?: number;
      verifiedBy?: string;
    }
  ): Promise<PaymentRecord> {
    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status,
        tnTransactionId: opts?.tnTransactionId,
        tnRefId: opts?.tnRefId,
        verifiedAmount: opts?.verifiedAmount,
        verifiedBy: opts?.verifiedBy,
        verifiedAt: status === "VERIFIED" ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });
    return this.toRecord(updated);
  }

  async incrementCheckCount(id: string, lastCheckedAt: Date): Promise<void> {
    await this.prisma.payment.update({
      where: { id },
      data: {
        checkCount: { increment: 1 },
        lastCheckedAt,
        updatedAt: new Date(),
      },
    });
  }

  async logVerification(log: {
    paymentId: string;
    found: boolean;
    apiResponse?: string;
    error?: string;
  }): Promise<void> {
    await this.prisma.paymentVerificationLog.create({
      data: {
        paymentId: log.paymentId,
        found: log.found,
        apiResponse: log.apiResponse ?? null,
        error: log.error ?? null,
      },
    });
  }
}

// ─── PrismaSessionRepository ──────────────────────────────────────────────────

export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaClient | PrismaTransactionClient) {}

  private toRecord(s: any): SessionRecord {
    return { ...s, status: s.status as SessionStatus };
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const s = await this.prisma.learningSession.findUnique({ where: { id } });
    return s ? this.toRecord(s) : null;
  }

  async findByMenteeId(menteeId: string, limit = 50): Promise<SessionRecord[]> {
    const results = await this.prisma.learningSession.findMany({
      where: { menteeId, isDeleted: false },
      orderBy: { scheduledAt: "desc" },
      take: limit,
    });
    return results.map(this.toRecord);
  }

  async findByMentorId(mentorId: string, limit = 50): Promise<SessionRecord[]> {
    const results = await this.prisma.learningSession.findMany({
      where: { mentorId, isDeleted: false },
      orderBy: { scheduledAt: "desc" },
      take: limit,
    });
    return results.map(this.toRecord);
  }

  async findUpcomingByMentorId(mentorId: string): Promise<SessionRecord[]> {
    const results = await this.prisma.learningSession.findMany({
      where: {
        mentorId,
        isDeleted: false,
        scheduledAt: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      orderBy: { scheduledAt: "asc" },
    });
    return results.map(this.toRecord);
  }

  async findPendingPaymentByMenteeId(menteeId: string): Promise<SessionRecord | null> {
    const s = await this.prisma.learningSession.findFirst({
      where: { menteeId, status: "PAYMENT_PENDING", isDeleted: false },
    });
    return s ? this.toRecord(s) : null;
  }

  async getMentorProfileFee(mentorUserId: string): Promise<MentorProfileFee | null> {
    const profile = await this.prisma.mentorProfile.findUnique({
      where: { userId: mentorUserId },
      select: {
        hourlyRate: true,
        tnAccountNo: true,
        tnAccountName: true,
        tnCampaignKeyword: true,
      },
    });
    if (!profile) return null;
    return {
      hourlyRate: profile.hourlyRate,
      tnAccountNo: profile.tnAccountNo,
      tnAccountName: profile.tnAccountName,
      tnCampaignKeyword: profile.tnCampaignKeyword,
    };
  }

  async create(input: BookSessionInput): Promise<SessionRecord> {
    const created = await this.prisma.learningSession.create({
      data: {
        id: input.id,
        menteeId: input.menteeId,
        mentorId: input.mentorId,
        teachingFieldId: input.teachingFieldId ?? null,
        title: input.title,
        description: input.description ?? null,
        status: "PENDING",
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes ?? 60,
        fee: input.fee ?? 0,
        notes: input.notes ?? null,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
        version: 1,
      },
    });
    return this.toRecord(created);
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
    }
  ): Promise<SessionRecord> {
    const updated = await this.prisma.learningSession.update({
      where: { id },
      data: {
        status,
        meetLink: opts?.meetLink,
        meetId: opts?.meetId,
        mentorNotes: opts?.mentorNotes,
        cancelReason: opts?.cancelReason,
        cancelledBy: opts?.cancelledBy,
        cancelledAt: opts?.cancelledBy ? new Date() : undefined,
        endAt:
          status === "COMPLETED" || status === "PAYMENT_PENDING"
            ? new Date()
            : undefined,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    return this.toRecord(updated);
  }

  async addRating(
    id: string,
    rating: number,
    comment?: string
  ): Promise<SessionRecord> {
    const updated = await this.prisma.learningSession.update({
      where: { id },
      data: {
        rating,
        ratingComment: comment ?? null,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    return this.toRecord(updated);
  }

  async getTopMentors(
    month: number,
    year: number,
    limit = 10
  ): Promise<LeaderboardEntry[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const results = await this.prisma.learningSession.groupBy({
      by: ["mentorId"],
      where: {
        scheduledAt: { gte: startDate, lt: endDate },
        status: { in: ["COMPLETED"] },
        isDeleted: false,
      },
      _count: { id: true },
      _sum: { fee: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    const entries: LeaderboardEntry[] = [];
    for (const r of results) {
      const user = await this.prisma.user.findUnique({
        where: { id: r.mentorId },
        select: { id: true, name: true, image: true },
      });
      if (user) {
        entries.push({
          userId: user.id,
          name: user.name,
          image: user.image,
          sessionCount: r._count.id,
          totalAmount: r._sum.fee ?? 0,
        });
      }
    }
    return entries;
  }

  async getTopMentees(
    month: number,
    year: number,
    limit = 10
  ): Promise<LeaderboardEntry[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const results = await this.prisma.learningSession.groupBy({
      by: ["menteeId"],
      where: {
        scheduledAt: { gte: startDate, lt: endDate },
        status: { in: ["COMPLETED"] },
        isDeleted: false,
      },
      _count: { id: true },
      _sum: { fee: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    const entries: LeaderboardEntry[] = [];
    for (const r of results) {
      const user = await this.prisma.user.findUnique({
        where: { id: r.menteeId },
        select: { id: true, name: true, image: true },
      });
      if (user) {
        entries.push({
          userId: user.id,
          name: user.name,
          image: user.image,
          sessionCount: r._count.id,
          totalAmount: r._sum.fee ?? 0,
        });
      }
    }
    return entries;
  }
}

// ─── PrismaTeachingFieldRepository ───────────────────────────────────────────

export class PrismaTeachingFieldRepository implements ITeachingFieldRepository {
  constructor(private readonly prisma: PrismaClient | PrismaTransactionClient) {}

  async findAll(): Promise<TeachingFieldRecord[]> {
    return this.prisma.teachingField.findMany({
      where: { isDeleted: false, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async findById(id: string): Promise<TeachingFieldRecord | null> {
    return this.prisma.teachingField.findUnique({ where: { id } });
  }

  async findByMentorId(mentorProfileId: string): Promise<TeachingFieldRecord[]> {
    const links = await this.prisma.mentorTeachingField.findMany({
      where: { mentorProfileId },
      include: { teachingField: true },
    });
    return links.map((l: any) => l.teachingField);
  }

  async create(input: Omit<TeachingFieldRecord, "id">): Promise<TeachingFieldRecord> {
    return this.prisma.teachingField.create({
      data: {
        ...input,
        id: createId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async update(id: string, data: Partial<TeachingFieldRecord>): Promise<TeachingFieldRecord> {
    return this.prisma.teachingField.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.teachingField.update({ where: { id }, data: { isDeleted: true, updatedAt: new Date() } });
  }

  async setMentorFields(mentorProfileId: string, fieldIds: string[]): Promise<void> {
    // Delete existing
    await this.prisma.mentorTeachingField.deleteMany({ where: { mentorProfileId } });
    // Re-create
    await this.prisma.mentorTeachingField.createMany({
      data: fieldIds.map((teachingFieldId) => ({
        id: createId(),
        mentorProfileId,
        teachingFieldId,
      })),
    });
  }
}
