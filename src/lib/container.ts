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
  ConfirmCompletionUseCase,
  MarkNoShowUseCase,
  RateSessionUseCase,
  ApplyForMentorUseCase,
  GetLeaderboardUseCase,
  GetMentorSessionsUseCase,
} from "../application/use-cases/session/SessionUseCases";
import {
  SubmitMentorApplicationUseCase,
  ListMentorApplicationsUseCase,
  ApproveMentorApplicationUseCase,
  RejectMentorApplicationUseCase,
} from "../application/use-cases/mentor/MentorApplicationUseCases";
import {
  UpdateMentorProfileUseCase,
  SetTeachingFieldsUseCase,
  GetMentorPublicProfileUseCase,
} from "../application/use-cases/mentor/MentorProfileUseCases";
import {
  CreateCharityAccountUseCase,
  ListCharityAccountsUseCase,
  UpdateCharityAccountUseCase,
  DeleteCharityAccountUseCase,
  InitiateCharityAccountVerificationUseCase,
  ConfirmCharityAccountVerificationUseCase,
} from "../application/use-cases/admin/CharityAccountUseCases";
import {
  GetSystemConfigUseCase,
  UpdateSystemConfigUseCase,
} from "../application/use-cases/admin/SystemConfigUseCases";
import {
  GetMenteeLearningStatsUseCase,
  GetMentorTeachingStatsUseCase,
} from "../application/use-cases/stats/StatsUseCases";
import {
  SubmitReportUseCase,
  ListReportsUseCase,
  ResolveReportUseCase,
} from "../application/use-cases/report/ReportUseCases";

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
    confirmCompletion: new ConfirmCompletionUseCase(uow),
    markNoShow: new MarkNoShowUseCase(uow),
    rateSession: new RateSessionUseCase(uow),
    applyForMentor: new ApplyForMentorUseCase(uow),
    getLeaderboard: new GetLeaderboardUseCase(uow),
    getMentorSessions: new GetMentorSessionsUseCase(uow),
    // Mentor Application
    submitMentorApplication: new SubmitMentorApplicationUseCase(uow),
    listMentorApplications: new ListMentorApplicationsUseCase(uow),
    approveMentorApplication: new ApproveMentorApplicationUseCase(uow),
    rejectMentorApplication: new RejectMentorApplicationUseCase(uow),
    // Mentor Profile
    updateMentorProfile: new UpdateMentorProfileUseCase(uow),
    setTeachingFields: new SetTeachingFieldsUseCase(uow),
    getMentorPublicProfile: new GetMentorPublicProfileUseCase(uow),
    // Charity Accounts
    createCharityAccount: new CreateCharityAccountUseCase(uow),
    listCharityAccounts: new ListCharityAccountsUseCase(uow),
    updateCharityAccount: new UpdateCharityAccountUseCase(uow),
    deleteCharityAccount: new DeleteCharityAccountUseCase(uow),
    initiateCharityAccountVerification: new InitiateCharityAccountVerificationUseCase(uow),
    confirmCharityAccountVerification: new ConfirmCharityAccountVerificationUseCase(uow),
    // System Config
    getSystemConfig: new GetSystemConfigUseCase(uow),
    updateSystemConfig: new UpdateSystemConfigUseCase(uow),
    // Stats
    getMenteeLearningStats: new GetMenteeLearningStatsUseCase(uow),
    getMentorTeachingStats: new GetMentorTeachingStatsUseCase(uow),
    // Reports
    submitReport: new SubmitReportUseCase(uow),
    listReports: new ListReportsUseCase(uow),
    resolveReport: new ResolveReportUseCase(uow),
  };
}

export type UseCases = ReturnType<typeof createUseCases>;
