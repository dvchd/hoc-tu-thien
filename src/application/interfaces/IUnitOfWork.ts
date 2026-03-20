import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { IPaymentRepository } from "../../domain/repositories/IPaymentRepository";
import {
  ISessionRepository,
  ITeachingFieldRepository,
} from "../../domain/repositories/ISessionRepository";

export interface IUnitOfWork {
  readonly users: IUserRepository;
  readonly payments: IPaymentRepository;
  readonly sessions: ISessionRepository;
  readonly teachingFields: ITeachingFieldRepository;

  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  execute<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T>;
}
