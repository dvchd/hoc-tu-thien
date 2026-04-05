# Hướng dẫn Kiểm thử – Học Từ Thiện

## Cài đặt

```bash
# 1. Cài đặt dependencies (bao gồm jest, ts-jest)
npm install

# 2. Tạo database test
npx prisma db push --schema=./prisma/schema.prisma
```

---

## Chạy test

```bash
# Toàn bộ test suite
npm test

# Chỉ Unit Tests (không cần DB, nhanh ~3–5s)
npm run test:unit

# Chỉ Integration Tests (cần Prisma + SQLite, ~10–20s)
npm run test:integration -- --runInBand

# E2E Scenario Tests
npm test -- --testPathPattern=e2e

# Xem coverage report
npm run test:coverage
# → Mở file: coverage/index.html

# Watch mode (development)
npm run test:watch

# CI mode (không interactive, exit code non-zero nếu fail)
npm run test:ci
```

---

## Cấu trúc Test

```
src/__tests__/
├── helpers.ts                  ← Builders & mock factories dùng chung
│                                 (buildSessionRecord đầy đủ 100% SessionRecord fields)
│
├── unit/                       ← Không cần DB, không cần network
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── AuditableEntity.test.ts              (9 tests)
│   │   │   ├── UserEntity.test.ts                   (23 tests)
│   │   │   ├── UserEntityEdgeCases.test.ts          (13 tests)
│   │   │   └── DomainEvents.test.ts                 (9 tests)
│   │   └── value-objects/
│   │       ├── ValueObjects.test.ts                 (21 tests)
│   │       ├── Payment.test.ts                      (29 tests)
│   │       ├── BookingPolicy.test.ts                (8 tests)
│   │       └── CancellationPolicy.test.ts           (3 tests)
│   ├── application/
│   │   ├── dtos/
│   │   │   └── UserDTO.test.ts                      (9 tests)
│   │   └── use-cases/
│   │       ├── UserUseCases.test.ts                 (16 tests)
│   │       ├── PaymentUseCases.test.ts              (14 tests)
│   │       ├── SessionUseCases.test.ts              (22 tests)
│   │       ├── MentorUseCases.test.ts               (8 tests)
│   │       ├── StatsUseCases.test.ts                (6 tests)
│   │       ├── ThienNguyenAppClient.test.ts         (12 tests)
│   │       └── CharityAccountVerificationUseCases.test.ts (46 tests)
│   └── infrastructure/
│       └── repositories/
│           ├── PrismaUserRepository.test.ts         (19 tests)
│           ├── PrismaSessionRepository.test.ts      (22 tests)
│           ├── PrismaMentorProfileRepository.test.ts(17 tests)
│           ├── PrismaMentorApplicationRepository.test.ts (13 tests)
│           ├── PrismaCharityAccountRepository.test.ts    (17 tests)
│           ├── PrismaSystemConfigRepository.test.ts (10 tests)
│           ├── PrismaReportRepository.test.ts       (12 tests)
│           ├── PrismaPaymentRepository.test.ts      (14 tests)
│           ├── PrismaUnitOfWork.test.ts             (10 tests)
│           └── GoogleMeetAndTeachingField.test.ts   (16 tests)
│
├── integration/                ← Cần Prisma + PostgreSQL test DB
│   ├── repositories/
│   │   ├── PrismaUserRepository.test.ts       (17 tests)
│   │   ├── PrismaUnitOfWork.test.ts           (7 tests)
│   │   └── PrismaPaymentSessionRepo.test.ts   (21 tests)
│   └── api/
│       ├── ApiRoutes.test.ts                  (17 tests)
│       └── CharityAccountVerificationApiRoutes.test.ts (18 tests)
│
└── e2e/                        ← Jest-based, mocked external services
    ├── UserJourney.test.ts                    (9 tests)
    └── FullFlowTests.test.ts                  (40+ tests – 4 scenarios)
                                              ──────────────────────────
                                         Total: 483 tests
```

---

## Phân loại test

### Unit Tests (mocked dependencies)
Kiểm tra logic nghiệp vụ độc lập, không cần DB hay network.

| File | Điều gì được test |
|---|---|
| `AuditableEntity` | Audit fields, soft delete, versioning, equals() |
| `UserEntity` | promoteToMentor, demoteToMentee, suspend, activate, softDelete, immutability |
| `ValueObjects` | Email validation/normalisation, UserRole labels, UserStatus |
| `Payment` | generateShortCode(), buildTransactionContent(), parseTransactionContent() round-trip, VietQR URL |
| `BookingPolicy` | BR03-06, BR09-11: activation check, max bookings, advance time, duration, conflict |
| `CancellationPolicy` | BR35: late cancellation threshold detection |
| `UserUseCases` | FindOrCreate, ChangeRole (RBAC), UpdateProfile, SoftDelete |
| `PaymentUseCases` | Activation initiate, verify (found/not found/expired), session fee |
| `SessionUseCases` | Book (guards), Confirm+Meet, Complete (free/paid), Cancel (late), DualConfirm, NoShow, Rate, Leaderboard |
| `MentorUseCases` | ApplyForMentor, GetMentorSessions |
| `StatsUseCases` | MenteeLearningStats, MentorTeachingStats |
| `CharityAccountVerificationUseCases` | Initiate probe, Confirm verification, full cycle, edge cases |
| `ThienNguyenAppClient` | API call, transaction matching, error handling |
| `PrismaMentorProfileRepository` | findById, findByUserId, findAll, create/update mapping, rating stats |
| `PrismaMentorApplicationRepository` | CRUD, findAll + filter, updateStatus |
| `PrismaCharityAccountRepository` | findAll, usageCount, clearDefault, verificationStatus |
| `PrismaSystemConfigRepository` | get, getNumber (fallback), set, setMultiple |
| `PrismaReportRepository` | findAll (status filter), create, updateStatus |
| `PrismaPaymentRepository` | CRUD, findByShortCode, updateStatus |
| `PrismaSessionRepository` | findConflicting, updateConfirmation, addRating, getTopMentors/Mentees |
| `GoogleMeetAndTeachingField` | GoogleMeetService, TeachingFieldRepository, setMentorFields |
| `PrismaUnitOfWork` | Lazy repos, execute/rollback |

### Integration Tests (real PostgreSQL)
Kiểm tra repository và transaction với database thực.

| File | Điều gì được test |
|---|---|
| `PrismaUserRepository` | CRUD, pagination, role filter, optimistic concurrency, soft delete, audit log |
| `PrismaUnitOfWork` | Transaction commit, rollback on error, nested execute, optimistic lock |
| `PrismaPaymentSessionRepo` | Payment lifecycle, session status transitions, updateConfirmation, leaderboard queries |
| `ApiRoutes` | HTTP status codes, auth guards (401/403), input validation (400), business errors |
| `CharityAccountVerificationApiRoutes` | POST initiate, PATCH confirm, 403 non-admin, full E2E cycle |

### E2E Scenario Tests (Jest-based, mocked external services)
Kiểm tra luồng nghiệp vụ đầu-cuối với mocked TN App + Google Meet.

| Scenario | Luồng |
|---|---|
| **UserJourney**: Registration & Activation | Register → Initiate → Verify → Activate |
| **UserJourney**: Full Session Lifecycle | Book → Confirm+Meet → Complete → PAYMENT_PENDING |
| **UserJourney**: Admin Role Management | Promote → Demote → RBAC audit |
| **UserJourney**: Leaderboard | Monthly stats, empty state |
| **FullFlow Scenario 1** – Mentee | Đăng ký → Kích hoạt → Book free → Book paid → Payment → Rate → Stats → Report → Cancel |
| **FullFlow Scenario 2** – Mentor | Apply → Approved → Profile setup → Teaching fields → Confirm → Complete → NoShow → Stats → Public profile |
| **FullFlow Scenario 3** – Admin | Users → Role change → Applications → Charity accounts → System config → Reports → Leaderboard |
| **FullFlow Scenario 4** – Cross-role | Admin setup → Mentee register/activate → apply mentor → Admin approve → Mentor setup → Book → Confirm → Complete → Payment → Rate → Report → Admin resolve |

---

## Conventions

### Mock factories (từ `helpers.ts`)
```typescript
import { buildUser, buildAdmin, buildMentor, createMockUnitOfWork } from "@/__tests__/helpers";

// Entity builders
const user   = buildUser({ id: "u1", status: UserStatus.ACTIVE });
const admin  = buildAdmin();
const mentor = buildMentor();

// Payload builders
const payment = buildPaymentRecord({ status: PaymentStatus.VERIFIED });
const session = buildSessionRecord({ fee: 200000, status: SessionStatus.CONFIRMED });

// Mock UoW với tất cả repositories đã được jest.fn()
const uow = createMockUnitOfWork();
uow.users.findById.mockResolvedValue(user);
uow.payments.create.mockResolvedValue(payment);
```

### Test pattern cho Use Cases
```typescript
it("description", async () => {
  // Arrange
  const uow = createMockUnitOfWork();
  uow.users.findById.mockResolvedValue(buildUser());

  // Act
  const result = await new MyUseCase(uow).execute({ ... });

  // Assert
  expect(result.someField).toBe("expected");
  expect(uow.someRepo.someMethod).toHaveBeenCalledWith(expect.objectContaining({ ... }));
});
```

---

## Coverage mục tiêu

| Layer | Target |
|---|---|
| Domain (entities, value objects) | ≥ 90% |
| Application (use cases, DTOs) | ≥ 85% |
| Infrastructure (repositories) | ≥ 75% |
| Overall | ≥ 75% |

Xem báo cáo chi tiết sau khi chạy:
```bash
npm run test:coverage
open coverage/index.html
```
