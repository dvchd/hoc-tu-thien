import { PrismaClient } from "@prisma/client";
import {
  IMentorApplicationRepository,
  MentorApplicationRecord,
  CreateMentorApplicationInput,
  FindMentorApplicationsOptions,
} from "../../../domain/repositories/IMentorApplicationRepository";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createId } = require("@paralleldrive/cuid2");

type PrismaTransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class PrismaMentorApplicationRepository implements IMentorApplicationRepository {
  constructor(private readonly prisma: PrismaClient | PrismaTransactionClient) {}

  private toRecord(a: any): MentorApplicationRecord {
    return {
      id: a.id,
      userId: a.userId,
      motivation: a.motivation,
      experience: a.experience,
      linkedinUrl: a.linkedinUrl,
      contactInfo: a.contactInfo,
      status: a.status,
      reviewedBy: a.reviewedBy,
      reviewedAt: a.reviewedAt,
      reviewNote: a.reviewNote,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      version: a.version,
      user: a.user
        ? {
            id: a.user.id,
            name: a.user.name,
            email: a.user.email,
            image: a.user.image,
          }
        : undefined,
    };
  }

  async findById(id: string): Promise<MentorApplicationRecord | null> {
    const a = await this.prisma.mentorApplication.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
    return a ? this.toRecord(a) : null;
  }

  async findByUserId(userId: string): Promise<MentorApplicationRecord | null> {
    const a = await this.prisma.mentorApplication.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
    return a ? this.toRecord(a) : null;
  }

  async findAll(options?: FindMentorApplicationsOptions): Promise<{
    applications: MentorApplicationRecord[];
    total: number;
  }> {
    const { status, page = 1, pageSize = 20 } = options ?? {};
    const where: any = {};
    if (status) where.status = status;

    const [results, total] = await Promise.all([
      this.prisma.mentorApplication.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.mentorApplication.count({ where }),
    ]);

    return {
      applications: results.map((a: any) => this.toRecord(a)),
      total,
    };
  }

  async create(input: CreateMentorApplicationInput): Promise<MentorApplicationRecord> {
    const created = await this.prisma.mentorApplication.create({
      data: {
        id: input.id || createId(),
        userId: input.userId,
        motivation: input.motivation,
        experience: input.experience,
        linkedinUrl: input.linkedinUrl ?? null,
        contactInfo: input.contactInfo ?? null,
        status: "PENDING",
        version: 1,
      },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
    return this.toRecord(created);
  }

  async updateStatus(
    id: string,
    status: string,
    reviewedBy: string,
    reviewNote?: string
  ): Promise<MentorApplicationRecord> {
    const updated = await this.prisma.mentorApplication.update({
      where: { id },
      data: {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNote: reviewNote ?? null,
        version: { increment: 1 },
      },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
    return this.toRecord(updated);
  }
}
