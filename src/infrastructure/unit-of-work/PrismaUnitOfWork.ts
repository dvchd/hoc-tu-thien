import { PrismaClient } from "@prisma/client";
import { IUnitOfWork } from "../../application/interfaces/IUnitOfWork";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { IPaymentRepository } from "../../domain/repositories/IPaymentRepository";
import { ISessionRepository, ITeachingFieldRepository } from "../../domain/repositories/ISessionRepository";
import { PrismaUserRepository } from "../database/repositories/PrismaUserRepository";
import {
  PrismaPaymentRepository,
  PrismaSessionRepository,
  PrismaTeachingFieldRepository,
} from "../database/repositories/PrismaPaymentSessionRepositories";

export class PrismaUnitOfWork implements IUnitOfWork {
  private _users: IUserRepository | null = null;
  private _payments: IPaymentRepository | null = null;
  private _sessions: ISessionRepository | null = null;
  private _teachingFields: ITeachingFieldRepository | null = null;

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

  async begin(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}
  async execute<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    return work(this);
  }
}
