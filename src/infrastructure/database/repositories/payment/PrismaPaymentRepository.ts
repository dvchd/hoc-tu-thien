import { PrismaClient } from "@prisma/client";
import {
  IPaymentRepository,
  CreatePaymentInput,
  PaymentRecord,
} from "../../../domain/repositories/IPaymentRepository";
import { PaymentStatus, PaymentType } from "../../../domain/value-objects/Payment";

type PrismaTransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

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

  async findPendingByUserId(userId: string, type?: PaymentType): Promise<PaymentRecord[]> {
    const where: any = { userId, status: "PENDING" };
    if (type) where.type = type;
    const results = await this.prisma.payment.findMany({ where });
    return results.map((p: any) => this.toRecord(p));
  }

  async findByUserId(userId: string, limit = 20): Promise<PaymentRecord[]> {
    const results = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return results.map((p: any) => this.toRecord(p));
  }

  async create(input: CreatePaymentInput): Promise<PaymentRecord> {
    const p = await this.prisma.payment.create({
      data: {
        id: input.id,
        userId: input.userId,
        sessionId: input.sessionId,
        type: input.type,
        amount: input.amount,
        transactionCode: input.transactionCode,
        shortCode: input.shortCode,
        tnAccountNo: input.tnAccountNo,
        tnAccountName: input.tnAccountName,
        expiresAt: input.expiresAt,
        status: "PENDING",
        version: 1,
      },
    });
    return this.toRecord(p);
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
    const p = await this.prisma.payment.update({
      where: { id },
      data: {
        status,
        tnTransactionId: opts?.tnTransactionId,
        tnRefId: opts?.tnRefId,
        verifiedAmount: opts?.verifiedAmount,
        verifiedBy: opts?.verifiedBy,
        verifiedAt: status === PaymentStatus.VERIFIED ? new Date() : undefined,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    return this.toRecord(p);
  }

  async incrementCheckCount(id: string, lastCheckedAt: Date): Promise<void> {
    await this.prisma.payment.update({
      where: { id },
      data: {
        checkCount: { increment: 1 },
        lastCheckedAt,
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
        apiResponse: log.apiResponse,
        error: log.error,
      },
    });
  }
}
