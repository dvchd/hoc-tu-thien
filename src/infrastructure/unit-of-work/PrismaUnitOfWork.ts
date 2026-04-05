import { PrismaClient } from "@prisma/client";
import { IUnitOfWork } from "../../application/interfaces/IUnitOfWork";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { IPaymentRepository } from "../../domain/repositories/IPaymentRepository";
import { ISessionRepository, ITeachingFieldRepository } from "../../domain/repositories/ISessionRepository";
import { IMentorApplicationRepository } from "../../domain/repositories/IMentorApplicationRepository";
import { ICharityAccountRepository } from "../../domain/repositories/ICharityAccountRepository";
import { ISystemConfigRepository } from "../../domain/repositories/ISystemConfigRepository";
import { IReportRepository } from "../../domain/repositories/IReportRepository";
import { IMentorProfileRepository } from "../../domain/repositories/IMentorProfileRepository";

import { PrismaUserRepository } from "../database/repositories/PrismaUserRepository";
import { PrismaMentorProfileRepository } from "../database/repositories/PrismaMentorProfileRepository";
import { PrismaPaymentRepository } from "../database/repositories/payment/PrismaPaymentRepository";
import { PrismaSessionRepository } from "../database/repositories/session/PrismaSessionRepository";
import { PrismaTeachingFieldRepository } from "../database/repositories/teaching-field/PrismaTeachingFieldRepository";
import { PrismaMentorApplicationRepository } from "../database/repositories/PrismaMentorApplicationRepository";
import { PrismaCharityAccountRepository } from "../database/repositories/PrismaCharityAccountRepository";
import { PrismaSystemConfigRepository } from "../database/repositories/PrismaSystemConfigRepository";
import { PrismaReportRepository } from "../database/repositories/PrismaReportRepository";

export class PrismaUnitOfWork implements IUnitOfWork {
  private _users: IUserRepository | null = null;
  private _payments: IPaymentRepository | null = null;
  private _sessions: ISessionRepository | null = null;
  private _teachingFields: ITeachingFieldRepository | null = null;
  private _mentorApplications: IMentorApplicationRepository | null = null;
  private _charityAccounts: ICharityAccountRepository | null = null;
  private _systemConfig: ISystemConfigRepository | null = null;
  private _reports: IReportRepository | null = null;
  private _mentorProfiles: IMentorProfileRepository | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  get users(): IUserRepository {
    if (!this._users) this._users = new PrismaUserRepository(this.prisma);
    return this._users;
  }

  get payments(): IPaymentRepository {
    if (!this._payments) this._payments = new PrismaPaymentRepository(this.prisma);
    return this._payments;
  }

  get sessions(): ISessionRepository {
    if (!this._sessions) this._sessions = new PrismaSessionRepository(this.prisma);
    return this._sessions;
  }

  get teachingFields(): ITeachingFieldRepository {
    if (!this._teachingFields) this._teachingFields = new PrismaTeachingFieldRepository(this.prisma);
    return this._teachingFields;
  }

  get mentorApplications(): IMentorApplicationRepository {
    if (!this._mentorApplications) this._mentorApplications = new PrismaMentorApplicationRepository(this.prisma);
    return this._mentorApplications;
  }

  get charityAccounts(): ICharityAccountRepository {
    if (!this._charityAccounts) this._charityAccounts = new PrismaCharityAccountRepository(this.prisma);
    return this._charityAccounts;
  }

  get systemConfig(): ISystemConfigRepository {
    if (!this._systemConfig) this._systemConfig = new PrismaSystemConfigRepository(this.prisma);
    return this._systemConfig;
  }

  get reports(): IReportRepository {
    if (!this._reports) this._reports = new PrismaReportRepository(this.prisma);
    return this._reports;
  }

  get mentorProfiles(): IMentorProfileRepository {
    if (!this._mentorProfiles) this._mentorProfiles = new PrismaMentorProfileRepository(this.prisma);
    return this._mentorProfiles;
  }

  async begin(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}

  async execute<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return work(new TransactionalUnitOfWork(tx as unknown as PrismaClient));
    });
  }
}

class TransactionalUnitOfWork implements IUnitOfWork {
  private _users: IUserRepository | null = null;
  private _payments: IPaymentRepository | null = null;
  private _sessions: ISessionRepository | null = null;
  private _teachingFields: ITeachingFieldRepository | null = null;
  private _mentorApplications: IMentorApplicationRepository | null = null;
  private _charityAccounts: ICharityAccountRepository | null = null;
  private _systemConfig: ISystemConfigRepository | null = null;
  private _reports: IReportRepository | null = null;
  private _mentorProfiles: IMentorProfileRepository | null = null;

  constructor(private readonly tx: PrismaClient) {}

  get users(): IUserRepository {
    if (!this._users) this._users = new PrismaUserRepository(this.tx);
    return this._users;
  }

  get payments(): IPaymentRepository {
    if (!this._payments) this._payments = new PrismaPaymentRepository(this.tx);
    return this._payments;
  }

  get sessions(): ISessionRepository {
    if (!this._sessions) this._sessions = new PrismaSessionRepository(this.tx);
    return this._sessions;
  }

  get teachingFields(): ITeachingFieldRepository {
    if (!this._teachingFields) this._teachingFields = new PrismaTeachingFieldRepository(this.tx);
    return this._teachingFields;
  }

  get mentorApplications(): IMentorApplicationRepository {
    if (!this._mentorApplications) this._mentorApplications = new PrismaMentorApplicationRepository(this.tx);
    return this._mentorApplications;
  }

  get charityAccounts(): ICharityAccountRepository {
    if (!this._charityAccounts) this._charityAccounts = new PrismaCharityAccountRepository(this.tx);
    return this._charityAccounts;
  }

  get systemConfig(): ISystemConfigRepository {
    if (!this._systemConfig) this._systemConfig = new PrismaSystemConfigRepository(this.tx);
    return this._systemConfig;
  }

  get reports(): IReportRepository {
    if (!this._reports) this._reports = new PrismaReportRepository(this.tx);
    return this._reports;
  }

  get mentorProfiles(): IMentorProfileRepository {
    if (!this._mentorProfiles) this._mentorProfiles = new PrismaMentorProfileRepository(this.tx);
    return this._mentorProfiles;
  }

  async begin(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}
  async execute<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    return work(this);
  }
}
