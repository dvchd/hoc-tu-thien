import { IMentorProfileRepository } from "../../domain/repositories/IMentorProfileRepository";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { IPaymentRepository } from "../../domain/repositories/IPaymentRepository";
import {
  ISessionRepository,
  ITeachingFieldRepository,
} from "../../domain/repositories/ISessionRepository";
import { IMentorApplicationRepository } from "../../domain/repositories/IMentorApplicationRepository";
import { ICharityAccountRepository } from "../../domain/repositories/ICharityAccountRepository";
import { ISystemConfigRepository } from "../../domain/repositories/ISystemConfigRepository";
import { IReportRepository } from "../../domain/repositories/IReportRepository";

export interface IUnitOfWork {
  readonly users: IUserRepository;
  readonly mentorProfiles: IMentorProfileRepository;
  readonly payments: IPaymentRepository;
  readonly sessions: ISessionRepository;
  readonly teachingFields: ITeachingFieldRepository;
  readonly mentorApplications: IMentorApplicationRepository;
  readonly charityAccounts: ICharityAccountRepository;
  readonly systemConfig: ISystemConfigRepository;
  readonly reports: IReportRepository;

  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  execute<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T>;
}
