// ─── Test Helpers & Shared Fixtures ──────────────────────────────────────────
// Reusable builders and mocks for all test suites

/** Create a Date at the top of the hour (minutes=0, seconds=0, ms=0) with an optional offset from now. */
export function nextTopOfHour(msOffset = 0): Date {
  const d = new Date(Date.now() + msOffset);
  d.setMinutes(0, 0, 0);
  return d;
}

import { UserEntity } from "@/domain/entities/User";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { IPaymentRepository, PaymentRecord } from "@/domain/repositories/IPaymentRepository";
import { ISessionRepository, ITeachingFieldRepository, SessionRecord } from "@/domain/repositories/ISessionRepository";
import { IUnitOfWork } from "@/application/interfaces/IUnitOfWork";
import { ISystemConfigRepository } from "@/domain/repositories/ISystemConfigRepository";
import { IMentorApplicationRepository } from "@/domain/repositories/IMentorApplicationRepository";
import { ICharityAccountRepository } from "@/domain/repositories/ICharityAccountRepository";
import { IReportRepository } from "@/domain/repositories/IReportRepository";
import { IMentorProfileRepository } from "@/domain/repositories/IMentorProfileRepository";
import { PaymentType, PaymentStatus, SessionStatus } from "@/domain/value-objects/Payment";

// ─── Entity Builders ──────────────────────────────────────────────────────────

export const buildUser = (overrides: Partial<Parameters<typeof UserEntity.create>[0]> = {}): UserEntity =>
  UserEntity.create({
    id: "user_test_001",
    email: "test@example.com",
    name: "Test User",
    image: null,
    role: UserRole.MENTEE,
    status: UserStatus.ACTIVE,
    createdBy: "system",
    ...overrides,
  });

export const buildAdmin = () =>
  buildUser({ id: "admin_001", email: "admin@example.com", role: UserRole.ADMIN });

export const buildMentor = () =>
  buildUser({ id: "mentor_001", email: "mentor@example.com", role: UserRole.MENTOR });

export const buildMentee = () =>
  buildUser({ id: "mentee_001", email: "mentee@example.com", role: UserRole.MENTEE });

// ─── Payment Record Builder ───────────────────────────────────────────────────

export const buildPaymentRecord = (overrides: Partial<PaymentRecord> = {}): PaymentRecord => ({
  id: "pay_001",
  userId: "mentee_001",
  sessionId: null,
  type: PaymentType.ACTIVATION,
  status: PaymentStatus.PENDING,
  amount: 10000,
  transactionCode: "HOCTUTHIEN KICHHOAT ABCDEF",
  shortCode: "ABCDEF",
  tnAccountNo: "2000",
  tnAccountName: "QUY THIEN NGUYEN",
  tnTransactionId: null,
  tnRefId: null,
  verifiedAt: null,
  verifiedAmount: null,
  verifiedBy: null,
  expiresAt: new Date(Date.now() + 86400000),
  lastCheckedAt: null,
  checkCount: 0,
  createdAt: new Date("2025-01-01T10:00:00Z"),
  updatedAt: new Date("2025-01-01T10:00:00Z"),
  ...overrides,
});

// ─── Session Record Builder ───────────────────────────────────────────────────

export const buildSessionRecord = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  id: "sess_001",
  menteeId: "mentee_001",
  mentorId: "mentor_001",
  teachingFieldId: null,
  title: "Học ReactJS cơ bản",
  description: null,
  status: SessionStatus.PENDING,
  scheduledAt: nextTopOfHour(86400000),
  durationMinutes: 60,
  endAt: null,
  meetLink: null,
  meetId: null,
  fee: 0,
  notes: null,
  mentorNotes: null,
  rating: null,
  ratingComment: null,
  mentorConfirmed: false,
  menteeConfirmed: false,
  isLateCancellation: false,
  isNoShow: false,
  noShowMarkedBy: null,
  cancelReason: null,
  cancelledBy: null,
  cancelledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  ...overrides,
});

// ─── Mock Repository Factories ────────────────────────────────────────────────

export function createMockUserRepository(): jest.Mocked<IUserRepository> {
  return {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    getUserStats: jest.fn(),
    existsByEmail: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    hardDelete: jest.fn(),
    createAuditLog: jest.fn(),
    incrementLateCancellation: jest.fn(),
    incrementNoShow: jest.fn(),
  };
}

export function createMockPaymentRepository(): jest.Mocked<IPaymentRepository> {
  return {
    findById: jest.fn(),
    findByShortCode: jest.fn(),
    findPendingByUserId: jest.fn(),
    findByUserId: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    incrementCheckCount: jest.fn(),
    logVerification: jest.fn(),
  };
}

export function createMockSessionRepository(): jest.Mocked<ISessionRepository> {
  return {
    findById: jest.fn(),
    findByMenteeId: jest.fn(),
    findByMentorId: jest.fn(),
    findUpcomingByMentorId: jest.fn(),
    findPendingPaymentByMenteeId: jest.fn(),
    findActiveByMenteeId: jest.fn(),
    countActiveByMenteeId: jest.fn(),
    findConflictingSession: jest.fn(),
    getMentorProfileFee: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    updateConfirmation: jest.fn(),
    addRating: jest.fn(),
    getTopMentors: jest.fn(),
    getTopMentees: jest.fn(),
    getMenteeStats: jest.fn(),
    getMentorStats: jest.fn(),
  };
}

export function createMockTeachingFieldRepository(): jest.Mocked<ITeachingFieldRepository> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByMentorId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    setMentorFields: jest.fn(),
  };
}

export function createMockSystemConfigRepository(): jest.Mocked<ISystemConfigRepository> {
  return {
    get: jest.fn(),
    getNumber: jest.fn(),
    getAll: jest.fn(),
    set: jest.fn(),
    setMultiple: jest.fn(),
  };
}

export function createMockMentorApplicationRepository(): jest.Mocked<IMentorApplicationRepository> {
  return {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    resubmit: jest.fn(),
  };
}

export function createMockCharityAccountRepository(): jest.Mocked<ICharityAccountRepository> {
  return {
    findById: jest.fn(),
    findByAccountNo: jest.fn(),
    findAll: jest.fn(),
    findDefault: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    delete: jest.fn(),
    getUsageCount: jest.fn(),
    clearDefault: jest.fn(),
    updateVerificationStatus: jest.fn(),
  };
}

export function createMockReportRepository(): jest.Mocked<IReportRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
  };
}

export function createMockMentorProfileRepository(): jest.Mocked<IMentorProfileRepository> {
  return {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    incrementTotalSessions: jest.fn(),
    updateRatingStats: jest.fn(),
    replaceAvailabilitySlots: jest.fn(),
  };
}

// ─── Mock Unit of Work Factory ────────────────────────────────────────────────

export function createMockUnitOfWork(overrides: Partial<{
  users: jest.Mocked<IUserRepository>;
  payments: jest.Mocked<IPaymentRepository>;
  sessions: jest.Mocked<ISessionRepository>;
  teachingFields: jest.Mocked<ITeachingFieldRepository>;
  systemConfig: jest.Mocked<ISystemConfigRepository>;
  mentorApplications: jest.Mocked<IMentorApplicationRepository>;
  charityAccounts: jest.Mocked<ICharityAccountRepository>;
  reports: jest.Mocked<IReportRepository>;
  mentorProfiles: jest.Mocked<IMentorProfileRepository>;
}> = {}): jest.Mocked<IUnitOfWork> {
  const users = overrides.users ?? createMockUserRepository();
  const payments = overrides.payments ?? createMockPaymentRepository();
  const sessions = overrides.sessions ?? createMockSessionRepository();
  const teachingFields = overrides.teachingFields ?? createMockTeachingFieldRepository();
  const systemConfig = overrides.systemConfig ?? createMockSystemConfigRepository();
  const mentorApplications = overrides.mentorApplications ?? createMockMentorApplicationRepository();
  const charityAccounts = overrides.charityAccounts ?? createMockCharityAccountRepository();
  const reports = overrides.reports ?? createMockReportRepository();
  const mentorProfiles = overrides.mentorProfiles ?? createMockMentorProfileRepository();

  const uow: jest.Mocked<IUnitOfWork> = {
    users,
    payments,
    sessions,
    teachingFields,
    systemConfig,
    mentorApplications,
    charityAccounts,
    reports,
    mentorProfiles,
    begin: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockImplementation(async (work) => work(uow)),
  };

  return uow;
}
