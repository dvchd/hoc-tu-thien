# HocTuThien - Development Plan (Layer Architecture)

**Project:** HocTuThien
**Date:** 27/03/2026
**Version:** v0.1
**Architecture:** Clean Architecture (Domain -> Application -> Infrastructure -> Presentation)

---

## Muc luc

1. [Tong quan phuong phap](#1-tong-quan-phuong-phap)
2. [Phase 1: Domain Layer](#2-phase-1-domain-layer)
3. [Phase 2: Infrastructure Layer](#3-phase-2-infrastructure-layer)
4. [Phase 3: Application Layer](#4-phase-3-application-layer)
5. [Phase 4: Presentation Layer (API + UI)](#5-phase-4-presentation-layer)
6. [Phase 5: Integration & Testing](#6-phase-5-integration--testing)
7. [Thu tu thuc hien de xuat](#7-thu-tu-thuc-hien-de-xuat)

---

## 1. Tong quan phuong phap

Ke hoach phat trien theo **bottom-up layer approach**:
1. **Domain Layer** truoc - dinh nghia entities, value objects, repository contracts
2. **Infrastructure Layer** - implement repositories, external services
3. **Application Layer** - business logic use cases
4. **Presentation Layer** - API routes va UI components

Moi phase co the test doc lap nho dependency inversion.

---

## 2. Phase 1: Domain Layer

> Muc tieu: Dinh nghia tat ca business concepts, rules va contracts can thiet.
> Estimated: 3-4 ngay

### 2.1 Value Objects - Sua doi

#### File: `src/domain/value-objects/Payment.ts`

**Them SessionStatus.NO_SHOW:**
```typescript
export enum SessionStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  NO_SHOW = "NO_SHOW",              // MOI
}
```

**Bo hardcoded constants, chuyen sang configurable:**
```typescript
// TRUOC (hardcoded):
// export const ACTIVATION_AMOUNT = 10000;
// SAU (lay tu SystemConfig):
// Xoa constant, dung SystemConfigService.get("activation_amount") trong use case
```

#### File moi: `src/domain/value-objects/CancellationPolicy.ts`
```typescript
export interface CancellationResult {
  canCancel: boolean;
  isLateCancellation: boolean;
  reason?: string;
}

export const LATE_CANCEL_THRESHOLD_MINUTES = 30; // default, configurable

export function evaluateCancellation(
  scheduledAt: Date,
  cancelAt: Date,
  thresholdMinutes: number = LATE_CANCEL_THRESHOLD_MINUTES
): CancellationResult;
```

#### File moi: `src/domain/value-objects/BookingPolicy.ts`
```typescript
export interface BookingValidationResult {
  canBook: boolean;
  reasons: string[];
}

export const MIN_ADVANCE_BOOKING_HOURS = 1; // default, configurable
export const MAX_ACTIVE_BOOKINGS = 1;
export const VALID_DURATIONS_HOURS = [1, 2, 3];

export function validateBookingEligibility(params: {
  menteeStatus: UserStatus;
  sessionFee: number;
  activeBookingCount: number;
  hasOutstandingPayment: boolean;
  scheduledAt: Date;
  durationHours: number;
  minAdvanceHours?: number;
}): BookingValidationResult;
```

### 2.2 Entities - Sua doi

#### File: `src/domain/entities/User.ts`

**Them fields:**
```typescript
// Trong UserEntity:
lateCancellationCount: number;  // default 0
noShowCount: number;            // default 0 (cho mentee)

// Methods moi:
incrementLateCancellation(): void;
incrementNoShow(): void;
```

### 2.3 Repository Interfaces - Moi

#### File moi: `src/domain/repositories/IMentorApplicationRepository.ts`
```typescript
export interface IMentorApplicationRepository {
  findById(id: string): Promise<MentorApplicationRecord | null>;
  findByUserId(userId: string): Promise<MentorApplicationRecord | null>;
  findAll(options?: { status?: string; page?: number; pageSize?: number }): Promise<{
    applications: MentorApplicationRecord[];
    total: number;
  }>;
  create(input: CreateApplicationInput): Promise<MentorApplicationRecord>;
  updateStatus(id: string, status: string, reviewedBy: string, reviewNote?: string): Promise<MentorApplicationRecord>;
}
```

#### File moi: `src/domain/repositories/ICharityAccountRepository.ts`
```typescript
export interface ICharityAccountRepository {
  findById(id: string): Promise<CharityAccountRecord | null>;
  findByAccountNo(accountNo: string): Promise<CharityAccountRecord | null>;
  findAll(options?: { isActive?: boolean; includeDeleted?: boolean }): Promise<CharityAccountRecord[]>;
  findDefault(): Promise<CharityAccountRecord | null>;
  create(input: CreateCharityAccountInput): Promise<CharityAccountRecord>;
  update(id: string, input: UpdateCharityAccountInput): Promise<CharityAccountRecord>;
  deactivate(id: string): Promise<void>;
  delete(id: string): Promise<void>;  // hard delete, chi khi usageCount = 0
  getUsageCount(id: string): Promise<number>;
}
```

#### File moi: `src/domain/repositories/ISystemConfigRepository.ts`
```typescript
export interface ISystemConfigRepository {
  get(key: string): Promise<string | null>;
  getAll(): Promise<SystemConfigRecord[]>;
  set(key: string, value: string, updatedBy: string): Promise<void>;
  setMultiple(configs: { key: string; value: string }[], updatedBy: string): Promise<void>;
}
```

#### File moi: `src/domain/repositories/IReportRepository.ts`
```typescript
export interface IReportRepository {
  findById(id: string): Promise<ReportRecord | null>;
  findAll(options?: { status?: string; page?: number; pageSize?: number }): Promise<{
    reports: ReportRecord[];
    total: number;
  }>;
  create(input: CreateReportInput): Promise<ReportRecord>;
  updateStatus(id: string, status: string, reviewedBy: string, reviewNote?: string): Promise<ReportRecord>;
}
```

### 2.4 Sua doi Repository Interfaces hien tai

#### File: `src/domain/repositories/ISessionRepository.ts`

**Them methods:**
```typescript
// Methods moi:
findActiveByMenteeId(menteeId: string): Promise<SessionRecord[]>;
// -> sessions co status: PENDING, CONFIRMED, IN_PROGRESS (khong COMPLETED, CANCELLED, PAYMENT_PENDING)

countActiveByMenteeId(menteeId: string): Promise<number>;
// -> dem so active bookings cua mentee

findConflictingSession(mentorId: string, scheduledAt: Date, durationMinutes: number): Promise<SessionRecord | null>;
// -> tim session cua mentor bi trung gio

updateConfirmation(id: string, confirmedBy: "mentor" | "mentee"): Promise<SessionRecord>;
// -> cap nhat mentorConfirmed hoac menteeConfirmed

markNoShow(id: string, markedBy: string): Promise<SessionRecord>;
// -> danh dau no-show
```

---

## 3. Phase 2: Infrastructure Layer

> Muc tieu: Implement cac repository va external services.
> Estimated: 4-5 ngay

### 3.1 Database Schema Changes

> Chi tiet xem file `docs/schema-changes.md`

**Tong hop:**
- Them 3 models moi: `CharityAccount`, `SystemConfig`, `Report`
- Sua `LearningSession`: them 5 fields (mentorConfirmed, menteeConfirmed, isLateCancellation, isNoShow, noShowMarkedBy)
- Sua `User`: them `lateCancellationCount`
- Sua `MenteeProfile`: them `noShowCount`
- Sua `MentorProfile`: them `charityAccountId`, `onlyActivatedMentee`

### 3.2 Repository Implementations Moi

#### File moi: `src/infrastructure/database/repositories/PrismaMentorApplicationRepository.ts`
- Implement `IMentorApplicationRepository`
- Include user info khi query (name, email, image)
- Support pagination va filter by status

#### File moi: `src/infrastructure/database/repositories/PrismaCharityAccountRepository.ts`
- Implement `ICharityAccountRepository`
- `getUsageCount()`: dem so MentorProfile va Payment tham chieu den account nay
- `delete()`: throw error neu usageCount > 0

#### File moi: `src/infrastructure/database/repositories/PrismaSystemConfigRepository.ts`
- Implement `ISystemConfigRepository`
- Upsert pattern cho `set()` method
- Cache in-memory voi TTL cho `get()` (tranh query moi request)

#### File moi: `src/infrastructure/database/repositories/PrismaReportRepository.ts`
- Implement `IReportRepository`
- Include reporter va reported user info

### 3.3 Sua Repository Implementations hien tai

#### File: `src/infrastructure/database/repositories/PrismaPaymentSessionRepositories.ts`

**PrismaSessionRepository - them methods:**
```typescript
async findActiveByMenteeId(menteeId: string): Promise<SessionRecord[]> {
  // WHERE menteeId = ? AND status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
}

async countActiveByMenteeId(menteeId: string): Promise<number> {
  // COUNT WHERE menteeId = ? AND status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
}

async findConflictingSession(mentorId: string, scheduledAt: Date, durationMinutes: number): Promise<SessionRecord | null> {
  // Tim session cua mentor ma thoi gian bi overlap
  // WHERE mentorId = ? AND status NOT IN ('CANCELLED', 'NO_SHOW')
  // AND (scheduledAt < endAt AND endAt > scheduledAt)
}

async updateConfirmation(id: string, confirmedBy: "mentor" | "mentee"): Promise<SessionRecord> {
  // Update mentorConfirmed hoac menteeConfirmed = true
}

async markNoShow(id: string, markedBy: string): Promise<SessionRecord> {
  // Update status = 'NO_SHOW', isNoShow = true, noShowMarkedBy = markedBy
}
```

### 3.4 External Services

#### File: `src/infrastructure/external/GoogleMeetService.ts`
**Chuyen sang Mentor tu nhap:**
```typescript
// Xoa/deprecate generateMeetLink()
// Them validation function:
export function validateMeetLink(url: string): boolean {
  return /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url);
}
```

### 3.5 Unit of Work Update

#### File: `src/infrastructure/unit-of-work/PrismaUnitOfWork.ts`
**Them repositories moi:**
```typescript
get mentorApplications(): IMentorApplicationRepository;
get charityAccounts(): ICharityAccountRepository;
get systemConfig(): ISystemConfigRepository;
get reports(): IReportRepository;
```

---

## 4. Phase 3: Application Layer

> Muc tieu: Implement tat ca business logic use cases.
> Estimated: 5-7 ngay

### 4.1 Mentor Application Use Cases

#### File moi: `src/application/use-cases/mentor/MentorApplicationUseCases.ts`

**SubmitMentorApplicationUseCase:**
- Input: `{ userId, motivation, experience, linkedinUrl?, contactInfo: { zalo?, facebook?, email } }`
- Validate: user exists, user is ACTIVE, khong co pending/approved application
- Output: `MentorApplicationRecord`
- Audit log: "MENTOR_APPLICATION_SUBMITTED"

**ListMentorApplicationsUseCase:**
- Input: `{ status?, page?, pageSize? }`
- Output: `{ applications: MentorApplicationRecord[], total: number }`
- Chi admin su dung

**ApproveMentorApplicationUseCase:**
- Input: `{ applicationId, reviewedBy, reviewNote? }`
- Logic:
  1. Update application status = APPROVED
  2. Create MentorProfile cho user
  3. Update user role = MENTOR
  4. Audit log: "MENTOR_APPLICATION_APPROVED"
- Output: `MentorApplicationRecord`

**RejectMentorApplicationUseCase:**
- Input: `{ applicationId, reviewedBy, reviewNote }`
- Logic: Update application status = REJECTED, ghi reviewNote
- Output: `MentorApplicationRecord`

### 4.2 Mentor Profile Use Cases

#### File moi: `src/application/use-cases/mentor/MentorProfileUseCases.ts`

**UpdateMentorProfileUseCase:**
- Input: `{ userId, headline?, expertise?, experience?, hourlyRate?, charityAccountId?, onlyActivatedMentee? }`
- Validate: user is MENTOR, charityAccountId thuoc danh sach active charity accounts
- Audit log: "MENTOR_PROFILE_UPDATED" voi old/new values
- Output: `MentorProfileRecord`

**SetTeachingFieldsUseCase:**
- Input: `{ userId, teachingFieldIds: string[] }`
- Logic: Neu doi teaching fields -> can admin re-review (BR30)
  - So sanh old vs new fields
  - Neu khac -> tao audit log "MENTOR_FIELDS_CHANGED_PENDING_REVIEW"
  - MVP: van cho update nhung ghi nhan de admin biet
- Output: `MentorProfileRecord`

**GetMentorPublicProfileUseCase:**
- Input: `{ mentorUserId }`
- Output: MentorProfile + User info + TeachingFields + AvailabilitySlots + rating + totalSessions + lateCancellationCount

### 4.3 Booking Use Cases - Sua doi

#### File: `src/application/use-cases/session/SessionUseCases.ts`

**BookSessionUseCase - them validations:**
```typescript
// Truoc khi tao session:
1. Validate mentee exists
2. Validate mentor exists + role = MENTOR + isAvailable = true
3. if (fee > 0 && mentee.status !== ACTIVE) -> reject (BR03)
4. if (fee === 0 && mentee.status === PENDING_ACTIVATION) -> allow (BR04)
5. if (activeBookingCount >= MAX_ACTIVE_BOOKINGS) -> reject (BR05)
6. if (hasOutstandingPayment) -> reject (BR09) [da co]
7. if (scheduledAt - now < minAdvanceHours) -> reject (BR10)
8. if (durationMinutes % 60 !== 0) -> reject (BR11)
9. if (conflictingSession exists) -> reject
10. if (mentor.onlyActivatedMentee && mentee.status !== ACTIVE) -> reject (BR06)
```

**CancelSessionUseCase - them late cancel logic:**
```typescript
// Khi huy:
1. Validate session exists, status cho phep huy
2. const minutesBeforeStart = (scheduledAt - now) / 60000
3. const isLate = minutesBeforeStart <= LATE_CANCEL_THRESHOLD_MINUTES (30 min)
4. if (isLate) -> session.isLateCancellation = true
5. if (isLate) -> increment user.lateCancellationCount
6. Update session status = CANCELLED
7. Audit log voi isLateCancellation flag
```

**CompleteSessionUseCase -> ConfirmCompletionUseCase (refactor):**
```typescript
// Doi tu chi mentor confirm sang dual confirmation:
1. Input: { sessionId, userId, role: "mentor" | "mentee" }
2. if role === "mentor" -> set mentorConfirmed = true
3. if role === "mentee" -> set menteeConfirmed = true
4. if (mentorConfirmed && menteeConfirmed) {
     if (fee > 0) status = PAYMENT_PENDING
     else status = COMPLETED
   }
5. Audit log
```

### 4.4 No-show Use Cases

#### Them vao file: `src/application/use-cases/session/SessionUseCases.ts`

**MarkNoShowUseCase:**
- Input: `{ sessionId, mentorId }`
- Validate: session exists, mentor is session's mentor, status in [CONFIRMED, IN_PROGRESS]
- Logic:
  1. Set status = NO_SHOW, isNoShow = true, noShowMarkedBy = mentorId
  2. Theo OQ05.1/OQ05.3: van tao payment obligation cho mentee
  3. if (fee > 0) -> chuyen sang PAYMENT_PENDING
  4. if (fee === 0) -> chi ghi nhan no-show, khong payment
  5. Increment mentee noShowCount
- Output: `SessionRecord`

### 4.5 Charity Account Use Cases

#### File moi: `src/application/use-cases/admin/CharityAccountUseCases.ts`

**CreateCharityAccountUseCase:**
- Input: `{ name, accountNo, bankName, campaignKeyword?, isDefault?, createdBy }`
- Validate: accountNo unique
- Neu isDefault = true -> bo default cua account cu
- Output: `CharityAccountRecord`

**ListCharityAccountsUseCase:**
- Input: `{ isActive?, includeDeleted? }`
- Output: `CharityAccountRecord[]`

**UpdateCharityAccountUseCase:**
- Input: `{ id, name?, bankName?, campaignKeyword?, isActive?, isDefault? }`
- Output: `CharityAccountRecord`

**DeleteCharityAccountUseCase:**
- Input: `{ id }`
- Validate: usageCount === 0 (BR20), else throw error
- Hard delete
- Neu usageCount > 0 -> suggest deactivate thay vi delete (BR21)

### 4.6 System Config Use Cases

#### File moi: `src/application/use-cases/admin/SystemConfigUseCases.ts`

**GetSystemConfigUseCase:**
- Input: `{ key? }` (null = get all)
- Output: `SystemConfigRecord | SystemConfigRecord[]`

**UpdateSystemConfigUseCase:**
- Input: `{ configs: { key: string, value: string }[], updatedBy: string }`
- Validate: key must be in allowed list
- Audit log: "SYSTEM_CONFIG_UPDATED"

### 4.7 Payment Use Cases - Sua doi

#### File: `src/application/use-cases/payment/PaymentUseCases.ts`

**InitiateSessionFeePaymentUseCase - fix TN account:**
```typescript
// TRUOC (bug):
// const accountNo = DEFAULT_TN_ACTIVATION_ACCOUNT;

// SAU (correct):
const mentorProfile = await uow.sessions.getMentorProfileFee(mentorUserId);
const accountNo = mentorProfile?.tnAccountNo || defaultCharityAccount.accountNo;
const accountName = mentorProfile?.tnAccountName || defaultCharityAccount.name;
```

**InitiateActivationUseCase - configurable amount:**
```typescript
// TRUOC:
// const amount = ACTIVATION_AMOUNT; // hardcoded 10000

// SAU:
const amountStr = await uow.systemConfig.get("activation_amount");
const amount = amountStr ? parseInt(amountStr) : 10000;

const defaultAccount = await uow.charityAccounts.findDefault();
const accountNo = defaultAccount?.accountNo || DEFAULT_TN_ACTIVATION_ACCOUNT;
```

### 4.8 Stats Use Cases

#### File moi: `src/application/use-cases/stats/StatsUseCases.ts`

**GetMenteeLearningStatsUseCase:**
- Input: `{ menteeId }`
- Query: COUNT sessions WHERE menteeId AND status = COMPLETED
- Query: SUM durationMinutes, SUM fee (paid), AVG rating given
- Output: `{ totalSessions, totalHours, totalDonated, avgRating }`

**GetMentorTeachingStatsUseCase:**
- Input: `{ mentorId }`
- Query: COUNT sessions WHERE mentorId AND status = COMPLETED
- Query: COUNT DISTINCT menteeId, SUM fee, SUM durationMinutes
- Output: `{ totalSessions, totalMentees, totalDonations, totalHours }`

### 4.9 Report Use Cases

#### File moi: `src/application/use-cases/report/ReportUseCases.ts`

**SubmitReportUseCase:**
- Input: `{ reporterId, reportedUserId, sessionId?, reason, description }`
- Output: `ReportRecord`

**ListReportsUseCase (admin):**
- Input: `{ status?, page?, pageSize? }`
- Output: `{ reports, total }`

**ResolveReportUseCase (admin):**
- Input: `{ reportId, reviewedBy, reviewNote, action? }`
- Output: `ReportRecord`

### 4.10 DI Container Update

#### File: `src/lib/container.ts`

**Them use cases moi:**
```typescript
export function createUseCases() {
  const uow = new PrismaUnitOfWork(prisma);
  return {
    uow,
    // ... existing use cases ...

    // Mentor Application
    submitMentorApplication: new SubmitMentorApplicationUseCase(uow),
    listMentorApplications: new ListMentorApplicationsUseCase(uow),
    approveMentorApplication: new ApproveMentorApplicationUseCase(uow),
    rejectMentorApplication: new RejectMentorApplicationUseCase(uow),

    // Mentor Profile
    updateMentorProfile: new UpdateMentorProfileUseCase(uow),
    setTeachingFields: new SetTeachingFieldsUseCase(uow),
    getMentorPublicProfile: new GetMentorPublicProfileUseCase(uow),

    // No-show
    markNoShow: new MarkNoShowUseCase(uow),

    // Charity Accounts
    createCharityAccount: new CreateCharityAccountUseCase(uow),
    listCharityAccounts: new ListCharityAccountsUseCase(uow),
    updateCharityAccount: new UpdateCharityAccountUseCase(uow),
    deleteCharityAccount: new DeleteCharityAccountUseCase(uow),

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
```

---

## 5. Phase 4: Presentation Layer

> Muc tieu: API routes va UI components.
> Estimated: 5-7 ngay
> Chi tiet API xem file `docs/api-plan.md`

### 5.1 API Routes Moi

| Method | Endpoint | Use Case | Actor |
|--------|----------|----------|-------|
| POST | `/api/mentor/apply` | SubmitMentorApplication (SUA LAI) | Mentee |
| GET | `/api/admin/mentor-applications` | ListMentorApplications | Admin |
| PATCH | `/api/admin/mentor-applications/[id]` | Approve/Reject | Admin |
| PUT | `/api/mentor/profile` | UpdateMentorProfile (SUA LAI) | Mentor |
| POST | `/api/mentor/teaching-fields` | SetTeachingFields | Mentor |
| GET | `/api/mentor/[id]/public-profile` | GetMentorPublicProfile | Public |
| GET | `/api/mentee/stats` | GetMenteeLearningStats | Mentee |
| GET | `/api/mentor/stats` | GetMentorTeachingStats | Mentor |
| GET | `/api/admin/charity-accounts` | ListCharityAccounts | Admin |
| POST | `/api/admin/charity-accounts` | CreateCharityAccount | Admin |
| PATCH | `/api/admin/charity-accounts/[id]` | UpdateCharityAccount | Admin |
| DELETE | `/api/admin/charity-accounts/[id]` | DeleteCharityAccount | Admin |
| GET | `/api/admin/config` | GetSystemConfig | Admin |
| PATCH | `/api/admin/config` | UpdateSystemConfig | Admin |
| POST | `/api/sessions/[id]/no-show` | MarkNoShow | Mentor |
| POST | `/api/sessions/[id]/confirm-completion` | ConfirmCompletion | Mentor/Mentee |
| POST | `/api/reports` | SubmitReport | Mentee |
| GET | `/api/admin/reports` | ListReports | Admin |
| PATCH | `/api/admin/reports/[id]` | ResolveReport | Admin |

### 5.2 UI Components Moi

#### Mentor Application Flow
- `src/presentation/components/mentor/MentorApplicationForm.tsx`
  - Form: motivation (textarea), experience (textarea), linkedin URL, contact info (zalo, facebook, email)
  - Submit -> POST /api/mentor/apply
  - Show trang thai application neu da submit
- `src/presentation/components/admin/MentorApplicationsTable.tsx`
  - Table: applicant info, motivation preview, status badge, submitted date
  - Actions: Approve (confirm dialog), Reject (dialog voi review note)

#### Mentor Public Profile
- `src/presentation/components/mentor/MentorPublicProfile.tsx`
  - Header: avatar, name, headline, rating stars, total sessions
  - Body: bio, expertise, teaching fields, experience years
  - Stats: total sessions, late cancellation count
  - Availability calendar: hien thi slots kha dung
  - CTA: "Dat lich hoc" button

#### Charity Account Manager
- `src/presentation/components/admin/CharityAccountManager.tsx`
  - Table: account name, account no, bank, status, usage count
  - Add form: name, accountNo (4 digits), bankName, campaignKeyword
  - Actions: edit, deactivate, delete (disabled if usage > 0)
  - Default account indicator

#### System Config Panel
- `src/presentation/components/admin/SystemConfigPanel.tsx`
  - Key-value editor cho cac config:
    - Activation amount (number input, VND)
    - Default charity account (dropdown)
    - Min booking advance hours (number)
    - Late cancel threshold minutes (number)
    - Payment expiry hours (number)
  - Save button -> PATCH /api/admin/config

#### Session Confirmation UI (Dual Confirm)
- Sua `src/presentation/components/session/SessionCard.tsx`:
  - Sau buoi hoc: hien thi 2 confirmation states
  - Mentor: "Xac nhan buoi hoc da hoan tat" button
  - Mentee: "Xac nhan da hoc xong" button
  - Khi ca 2 confirmed -> hien thi "Da hoan tat"
  - Dispute: "Bao cao van de" link

#### No-show UI
- Sua `src/presentation/components/session/SessionCard.tsx`:
  - Mentor view: "Danh dau mentee vang mat" button (chi hien thi sau gio bat dau session)
  - Confirm dialog truoc khi danh dau

#### Report Form
- `src/presentation/components/review/ReportForm.tsx`
  - Gop vao review flow: sau khi rating -> option "Bao cao van de"
  - Fields: reason (dropdown: khong phu hop, hanh vi xau, khac), description (textarea)

#### Late Cancel Badge
- Sua `src/presentation/components/mentor/MentorPublicProfile.tsx`:
  - Hien thi "Huy muon: X lan" tren profile

### 5.3 Pages Moi va Sua doi

| Page | File | Muc dich |
|------|------|---------|
| Mentor Application | `src/app/(dashboard)/dashboard/mentee/apply-mentor/page.tsx` | Form dang ky mentor |
| Mentor Applications (Admin) | `src/app/(dashboard)/dashboard/admin/mentor-applications/page.tsx` | Admin review applications |
| Mentor Public Profile | `src/app/(dashboard)/dashboard/mentee/mentor/[id]/page.tsx` | Mentee xem ho so mentor |
| Charity Accounts (Admin) | `src/app/(dashboard)/dashboard/admin/charity-accounts/page.tsx` | Admin quan ly TN accounts |
| System Config (Admin) | `src/app/(dashboard)/dashboard/admin/config/page.tsx` | Admin cau hinh he thong |
| Reports (Admin) | `src/app/(dashboard)/dashboard/admin/reports/page.tsx` | Admin xem reports |

### 5.4 Sua doi Pages hien tai

| Page | Thay doi |
|------|---------|
| Mentor Dashboard | Thay mock data bang real stats tu API |
| Mentee Dashboard | Thay mock data bang real stats tu API |
| Mentor Sessions | Them no-show button, dual confirm UI |
| Mentee Sessions | Them confirm completion button |
| Find Mentor | Them link den mentor public profile |
| Admin Overview | Them link den mentor applications |
| Sidebar | Fix dead links, them menu items moi |

---

## 6. Phase 5: Integration & Testing

> Muc tieu: Dam bao tat ca features hoat dong dung.
> Estimated: 3-4 ngay

### 6.1 Unit Tests Moi

| Test File | Doi tuong | So tests du kien |
|-----------|----------|-----------------|
| `MentorApplicationUseCases.test.ts` | Submit, Approve, Reject flows | ~15 tests |
| `BookingValidations.test.ts` | Tat ca booking rules | ~20 tests |
| `CancellationPolicy.test.ts` | Late cancel detection | ~10 tests |
| `NoShowUseCases.test.ts` | No-show marking | ~8 tests |
| `DualConfirmation.test.ts` | Dual completion flow | ~12 tests |
| `CharityAccountUseCases.test.ts` | CRUD + validation | ~12 tests |
| `SystemConfigUseCases.test.ts` | Get/Set config | ~6 tests |
| `StatsUseCases.test.ts` | Learning/Teaching stats | ~8 tests |
| `ReportUseCases.test.ts` | Submit/Resolve reports | ~8 tests |
| `PaymentFix.test.ts` | Correct TN account routing | ~5 tests |

**Tong: ~104 tests moi (tren ~247 hien tai = ~351 tests)**

### 6.2 Integration Tests

| Test File | Doi tuong |
|-----------|----------|
| `PrismaMentorApplicationRepo.test.ts` | Repository CRUD |
| `PrismaCharityAccountRepo.test.ts` | Repository CRUD + usage count |
| `BookingApiRoutes.test.ts` | Full booking flow voi validations |
| `MentorApplicationApiRoutes.test.ts` | Application submit + approval flow |

### 6.3 E2E Test Updates

| Test | Scenario |
|------|----------|
| `MentorApplicationJourney.test.ts` | Mentee apply -> Admin approve -> Mentor setup profile -> Open slots |
| `BookingWithValidations.test.ts` | Full booking flow voi tat ca BR checks |
| `CancellationJourney.test.ts` | Normal cancel + Late cancel + No-show |
| `DualConfirmJourney.test.ts` | Session complete voi ca 2 confirm |

---

## 7. Thu tu thuc hien de xuat

### Wave 1: Foundation (ngay 1-4)
> Domain + Infrastructure cho cac features core

1. Schema changes (migration)
2. Value objects moi (CancellationPolicy, BookingPolicy)
3. Repository interfaces moi
4. Repository implementations moi
5. Unit of Work update

### Wave 2: Core Business Logic (ngay 5-11)
> Use cases cho cac tinh nang P1

6. Mentor Application use cases + API + UI
7. Booking validations (sua BookSessionUseCase)
8. Cancellation rules (sua CancelSessionUseCase)
9. Dual confirmation (refactor CompleteSessionUseCase)
10. No-show handling
11. Payment fix (TN account routing)
12. Google Meet -> mentor tu nhap

### Wave 3: Admin Features (ngay 12-16)
> Admin tools va configuration

13. Charity Account management (use cases + API + UI)
14. System Config (use cases + API + UI)
15. Mentor Profile use cases refactor
16. Admin mentor application review UI

### Wave 4: Polish & Stats (ngay 17-20)
> Statistics, reports, UI polish

17. Mentee/Mentor statistics (real data)
18. Report system
19. Late cancel display on profile
20. Sua cac trang dashboard thay mock data

### Wave 5: Testing (ngay 21-25)
> Comprehensive testing

21. Unit tests cho tat ca use cases moi
22. Integration tests cho repositories
23. API route tests
24. E2E journey tests
25. Regression testing

---

## Appendix: Files tham chieu

| Layer | Directory | Files hien tai |
|-------|-----------|---------------|
| Domain | `src/domain/` | entities/, value-objects/, repositories/, events/ |
| Application | `src/application/` | use-cases/, dtos/, interfaces/ |
| Infrastructure | `src/infrastructure/` | database/repositories/, external/, unit-of-work/ |
| Presentation | `src/presentation/` | components/ (12 files) |
| API | `src/app/api/` | auth/, admin/, mentor/, sessions/, payments/, leaderboard/, teaching-fields/, users/ |
| Pages | `src/app/` | (auth)/, (dashboard)/ |
| Config | root | prisma/schema.prisma, src/lib/container.ts |
