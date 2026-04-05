import { PrismaClient } from "@prisma/client";
import {
  IReportRepository,
  ReportRecord,
  CreateReportInput,
  FindReportsOptions,
} from "../../../domain/repositories/IReportRepository";

type PrismaTransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class PrismaReportRepository implements IReportRepository {
  constructor(private readonly prisma: PrismaClient | PrismaTransactionClient) {}

  private toRecord(r: any): ReportRecord {
    return {
      id: r.id,
      reporterId: r.reporterId,
      reportedUserId: r.reportedUserId,
      sessionId: r.sessionId,
      reason: r.reason,
      description: r.description,
      status: r.status,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt,
      reporter: r.reporter
        ? { id: r.reporter.id, name: r.reporter.name, email: r.reporter.email, image: r.reporter.image }
        : undefined,
      reportedUser: r.reportedUser
        ? { id: r.reportedUser.id, name: r.reportedUser.name, email: r.reportedUser.email, image: r.reportedUser.image }
        : undefined,
    };
  }

  async findById(id: string): Promise<ReportRecord | null> {
    const r = await this.prisma.report.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, name: true, email: true, image: true } },
        reportedUser: { select: { id: true, name: true, email: true, image: true } },
      },
    });
    return r ? this.toRecord(r) : null;
  }

  async findAll(options?: FindReportsOptions): Promise<{ reports: ReportRecord[]; total: number }> {
    const { status, page = 1, pageSize = 20 } = options ?? {};
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [results, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, name: true, email: true, image: true } },
          reportedUser: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports: results.map((r) => this.toRecord(r)), total };
  }

  async create(input: CreateReportInput): Promise<ReportRecord> {
    const created = await this.prisma.report.create({
      data: {
        id: input.id,
        reporterId: input.reporterId,
        reportedUserId: input.reportedUserId,
        sessionId: input.sessionId ?? null,
        reason: input.reason,
        description: input.description,
        status: "PENDING",
      },
      include: {
        reporter: { select: { id: true, name: true, email: true, image: true } },
        reportedUser: { select: { id: true, name: true, email: true, image: true } },
      },
    });
    return this.toRecord(created);
  }

  async updateStatus(
    id: string,
    status: string,
    reviewedBy: string,
    reviewNote?: string
  ): Promise<ReportRecord> {
    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNote: reviewNote ?? null,
      },
      include: {
        reporter: { select: { id: true, name: true, email: true, image: true } },
        reportedUser: { select: { id: true, name: true, email: true, image: true } },
      },
    });
    return this.toRecord(updated);
  }
}
