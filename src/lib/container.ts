import { prisma } from "../infrastructure/database/prisma/client";
import { PrismaUnitOfWork } from "../infrastructure/unit-of-work/PrismaUnitOfWork";
import {
  FindOrCreateUserUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  ChangeUserRoleUseCase,
  UpdateUserProfileUseCase,
  SoftDeleteUserUseCase,
} from "../application/use-cases/user/UserUseCases";
import {
  InitiateActivationUseCase,
  VerifyPaymentUseCase,
  InitiateSessionFeePaymentUseCase,
} from "../application/use-cases/payment/PaymentUseCases";
import {
  BookSessionUseCase,
  ConfirmSessionUseCase,
  CancelSessionUseCase,
  CompleteSessionUseCase,
  RateSessionUseCase,
  ApplyForMentorUseCase,
  GetLeaderboardUseCase,
  GetMentorSessionsUseCase,
} from "../application/use-cases/session/SessionUseCases";

function createUnitOfWork() {
  return new PrismaUnitOfWork(prisma);
}

export function createUseCases() {
  const uow = createUnitOfWork();

  return {
    uow,
    // User
    findOrCreateUser: new FindOrCreateUserUseCase(uow),
    getUser: new GetUserUseCase(uow),
    listUsers: new ListUsersUseCase(uow),
    changeUserRole: new ChangeUserRoleUseCase(uow),
    updateUserProfile: new UpdateUserProfileUseCase(uow),
    softDeleteUser: new SoftDeleteUserUseCase(uow),
    // Payment
    initiateActivation: new InitiateActivationUseCase(uow),
    verifyPayment: new VerifyPaymentUseCase(uow),
    initiateSessionFeePayment: new InitiateSessionFeePaymentUseCase(uow),
    // Session
    bookSession: new BookSessionUseCase(uow),
    confirmSession: new ConfirmSessionUseCase(uow),
    cancelSession: new CancelSessionUseCase(uow),
    completeSession: new CompleteSessionUseCase(uow),
    rateSession: new RateSessionUseCase(uow),
    applyForMentor: new ApplyForMentorUseCase(uow),
    getLeaderboard: new GetLeaderboardUseCase(uow),
    getMentorSessions: new GetMentorSessionsUseCase(uow),
  };
}

export type UseCases = ReturnType<typeof createUseCases>;
