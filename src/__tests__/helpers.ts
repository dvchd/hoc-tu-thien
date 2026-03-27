// ─── Test Helpers & Shared Fixtures ──────────────────────────────────────────
// Reusable builders and mocks for all test suites

import { UserEntity } from "@/domain/entities/User";
import { UserRole } from "@/domain/value-objects/UserRole";
import { UserStatus } from "@/domain/value-objects/UserStatus";
import { IUserRepository, FindUsersOptions, UserCount } from "@/domain/repositories/IUserRepository";
import { IPaymentRepository, CreatePaymentInput, PaymentRecord } from "@/domain/repositories/IPaymentRepository";
import { ISessionRepository, ITeachingFieldRepository, BookSessionInput, SessionRecord, TeachingFieldRecord, LeaderboardEntry } from "@/domain/repositories/ISessionRepository";
import { IUnitOfWork } from "@/application/interfaces/IUnitOfWork";
import { PaymentType, PaymentStatus, SessionStatus } from "@/domain/value-objects/Payment";

// ─── Entity Builders ──────────────────────────────────────────────────────────

export const buildUser = (overrides: Partial<Parameters<typeof UserEntity.create>[0]> = {}): UserEntity =>
  UserEntity.create({
    id: "user_test_001",
    email: "test@example.com",
    name: "Test User",
    image: null,
    role: UserRole.MENTEE,
    status: UserStatus.ACTIVE, // tests override this as needed
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
  scheduledAt: new Date(Date.now() + 86400000),
  durationMinutes: 60,
  endAt: null,
  meetLink: null,
  meetId: null,
  fee: 0,
  notes: null,
  mentorNotes: null,
  rating: null,
  ratingComment: null,
  cancelReason: null,
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
    getMentorProfileFee: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    addRating: jest.fn(),
    getTopMentors: jest.fn(),
    getTopMentees: jest.fn(),
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

// ─── Mock Unit of Work Factory ────────────────────────────────────────────────

export function createMockUnitOfWork(overrides: Partial<{
  users: jest.Mocked<IUserRepository>;
  payments: jest.Mocked<IPaymentRepository>;
  sessions: jest.Mocked<ISessionRepository>;
  teachingFields: jest.Mocked<ITeachingFieldRepository>;
}> = {}): jest.Mocked<IUnitOfWork> {
  const users = overrides.users ?? createMockUserRepository();
  const payments = overrides.payments ?? createMockPaymentRepository();
  const sessions = overrides.sessions ?? createMockSessionRepository();
  const teachingFields = overrides.teachingFields ?? createMockTeachingFieldRepository();

  const uow: jest.Mocked<IUnitOfWork> = {
    users,
    payments,
    sessions,
    teachingFields,
    begin: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockImplementation(async (work) => work(uow)),
  };

  return uow;
}
