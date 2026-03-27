# HocTuThien - Implementation Checklist

**Project:** HocTuThien
**Date:** 27/03/2026
**Version:** v0.1

---

## Cach su dung

- [ ] = Chua lam
- [x] = Da hoan thanh
- Moi task co reference den Gap ID (xem `gap-analysis.md`) va file can tao/sua

---

## Wave 1: Foundation (Domain + Infrastructure)

### 1.1 Schema Migration

- [ ] **[GAP-I]** Them model `CharityAccount` vao `prisma/schema.prisma`
- [ ] **[GAP-J]** Them model `SystemConfig` vao `prisma/schema.prisma`
- [ ] **[GAP-O]** Them model `Report` vao `prisma/schema.prisma`
- [ ] **[GAP-D]** Them fields `mentorConfirmed`, `menteeConfirmed` vao `LearningSession`
- [ ] **[GAP-E]** Them field `isLateCancellation` vao `LearningSession`
- [ ] **[GAP-F]** Them fields `isNoShow`, `noShowMarkedBy` vao `LearningSession`
- [ ] **[GAP-E]** Them field `lateCancellationCount` vao `User`
- [ ] **[GAP-F]** Them field `noShowCount` vao `MenteeProfile`
- [ ] **[GAP-B]** Them fields `charityAccountId`, `onlyActivatedMentee` vao `MentorProfile`
- [ ] **[GAP-O]** Them relations `reportsMade`, `reportsReceived` vao `User`
- [ ] Them indexes can thiet (xem `schema-changes.md` Section 6)
- [ ] Chay `npx prisma migrate dev --name add_charity_config_report_models`
- [ ] Cap nhat `prisma/seed.ts` voi default CharityAccount va SystemConfig
- [ ] Chay `npm run prisma:seed` de seed data moi

### 1.2 Domain Layer - Value Objects

- [ ] **[GAP-E]** Tao `src/domain/value-objects/CancellationPolicy.ts`
  - [ ] Function `evaluateCancellation(scheduledAt, cancelAt, thresholdMinutes)`
  - [ ] Interface `CancellationResult { canCancel, isLateCancellation, reason }`
  - [ ] Constant `LATE_CANCEL_THRESHOLD_MINUTES = 30`

- [ ] **[GAP-C]** Tao `src/domain/value-objects/BookingPolicy.ts`
  - [ ] Function `validateBookingEligibility(params)`
  - [ ] Interface `BookingValidationResult { canBook, reasons }`
  - [ ] Constants: `MIN_ADVANCE_BOOKING_HOURS`, `MAX_ACTIVE_BOOKINGS`, `VALID_DURATIONS_HOURS`

- [ ] **[GAP-F]** Sua `src/domain/value-objects/Payment.ts`
  - [ ] Them `NO_SHOW` vao `SessionStatus` enum
  - [ ] Them label va color cho NO_SHOW

### 1.3 Domain Layer - Repository Interfaces

- [ ] **[GAP-A]** Tao `src/domain/repositories/IMentorApplicationRepository.ts`
  - [ ] `findById`, `findByUserId`, `findAll`, `create`, `updateStatus`

- [ ] **[GAP-I]** Tao `src/domain/repositories/ICharityAccountRepository.ts`
  - [ ] `findById`, `findByAccountNo`, `findAll`, `findDefault`, `create`, `update`, `deactivate`, `delete`, `getUsageCount`

- [ ] **[GAP-J]** Tao `src/domain/repositories/ISystemConfigRepository.ts`
  - [ ] `get`, `getAll`, `set`, `setMultiple`

- [ ] **[GAP-O]** Tao `src/domain/repositories/IReportRepository.ts`
  - [ ] `findById`, `findAll`, `create`, `updateStatus`

- [ ] **[GAP-C,D,F]** Sua `src/domain/repositories/ISessionRepository.ts`
  - [ ] Them `findActiveByMenteeId(menteeId)`
  - [ ] Them `countActiveByMenteeId(menteeId)`
  - [ ] Them `findConflictingSession(mentorId, scheduledAt, durationMinutes)`
  - [ ] Them `updateConfirmation(id, confirmedBy)`
  - [ ] Them `markNoShow(id, markedBy)`

### 1.4 Infrastructure Layer - Repository Implementations

- [ ] **[GAP-A]** Tao `src/infrastructure/database/repositories/PrismaMentorApplicationRepository.ts`
  - [ ] Implement tat ca IMentorApplicationRepository methods
  - [ ] Include user info (name, email, image) khi query

- [ ] **[GAP-I]** Tao `src/infrastructure/database/repositories/PrismaCharityAccountRepository.ts`
  - [ ] Implement tat ca ICharityAccountRepository methods
  - [ ] `getUsageCount()`: dem MentorProfile + Payment references
  - [ ] `delete()`: throw error neu usageCount > 0

- [ ] **[GAP-J]** Tao `src/infrastructure/database/repositories/PrismaSystemConfigRepository.ts`
  - [ ] Implement tat ca ISystemConfigRepository methods
  - [ ] Upsert pattern cho `set()`

- [ ] **[GAP-O]** Tao `src/infrastructure/database/repositories/PrismaReportRepository.ts`
  - [ ] Implement tat ca IReportRepository methods
  - [ ] Include reporter + reported user info

- [ ] **[GAP-C,D,F]** Sua `src/infrastructure/database/repositories/PrismaPaymentSessionRepositories.ts`
  - [ ] Implement `findActiveByMenteeId`
  - [ ] Implement `countActiveByMenteeId`
  - [ ] Implement `findConflictingSession`
  - [ ] Implement `updateConfirmation`
  - [ ] Implement `markNoShow`

### 1.5 Infrastructure - Unit of Work

- [ ] Sua `src/infrastructure/unit-of-work/PrismaUnitOfWork.ts`
  - [ ] Them `get mentorApplications(): IMentorApplicationRepository`
  - [ ] Them `get charityAccounts(): ICharityAccountRepository`
  - [ ] Them `get systemConfig(): ISystemConfigRepository`
  - [ ] Them `get reports(): IReportRepository`

### 1.6 Infrastructure - External Services

- [ ] **[GAP-L]** Sua `src/infrastructure/external/GoogleMeetService.ts`
  - [ ] Them `validateMeetLink(url): boolean` function
  - [ ] Deprecate `generateMeetLink()` (giu lai de khong break tests)

---

## Wave 2: Core Business Logic (Application Layer)

### 2.1 Mentor Application Use Cases

- [ ] **[GAP-A]** Tao `src/application/use-cases/mentor/MentorApplicationUseCases.ts`
  - [ ] `SubmitMentorApplicationUseCase`
    - [ ] Validate: user exists, ACTIVE, no pending/approved application
    - [ ] Create MentorApplication record
    - [ ] Audit log
  - [ ] `ListMentorApplicationsUseCase`
    - [ ] Filter by status, pagination
  - [ ] `ApproveMentorApplicationUseCase`
    - [ ] Update application -> APPROVED
    - [ ] Create MentorProfile
    - [ ] Update user role -> MENTOR
    - [ ] Audit log
  - [ ] `RejectMentorApplicationUseCase`
    - [ ] Update application -> REJECTED
    - [ ] Ghi reviewNote
    - [ ] Audit log

### 2.2 Mentor Profile Use Cases

- [ ] **[GAP-B]** Tao `src/application/use-cases/mentor/MentorProfileUseCases.ts`
  - [ ] `UpdateMentorProfileUseCase`
    - [ ] Validate: user is MENTOR
    - [ ] Validate: charityAccountId thuoc active accounts (BR08)
    - [ ] Audit log voi old/new values
  - [ ] `SetTeachingFieldsUseCase`
    - [ ] So sanh old vs new fields
    - [ ] Ghi nhan thay doi cho admin review (BR30)
  - [ ] `GetMentorPublicProfileUseCase`
    - [ ] Return profile + user info + fields + availability + stats

### 2.3 Booking Validations (Sua Use Case hien tai)

- [ ] **[GAP-C]** Sua `src/application/use-cases/session/SessionUseCases.ts` - BookSessionUseCase
  - [ ] Them check: activation required cho paid session (BR03)
  - [ ] Them check: unactivated mentee allowed for free session (BR04)
  - [ ] Them check: max active bookings (BR05)
  - [ ] Them check: minimum advance booking time (BR10)
  - [ ] Them check: duration must be whole hours (BR11)
  - [ ] Them check: schedule conflict detection
  - [ ] Them check: mentor.isAvailable
  - [ ] Them check: mentor.onlyActivatedMentee (BR06)
  - [ ] Doc cac config tu SystemConfig thay vi hardcoded

### 2.4 Dual Confirmation (Sua/Them Use Case)

- [ ] **[GAP-D]** Sua `src/application/use-cases/session/SessionUseCases.ts`
  - [ ] Refactor `CompleteSessionUseCase` -> `ConfirmCompletionUseCase`
  - [ ] Logic: nhan userId, xac dinh role (mentor/mentee)
  - [ ] Set mentorConfirmed hoac menteeConfirmed
  - [ ] Khi ca 2 true: chuyen status tuong ung
  - [ ] Mentor co the nhap meetLink khi confirm

### 2.5 Cancellation Rules (Sua Use Case hien tai)

- [ ] **[GAP-E]** Sua `src/application/use-cases/session/SessionUseCases.ts` - CancelSessionUseCase
  - [ ] Doc late_cancel_threshold tu SystemConfig
  - [ ] Calculate minutesBeforeStart
  - [ ] Set isLateCancellation = true neu <= threshold
  - [ ] Increment user.lateCancellationCount

### 2.6 No-show Handling

- [ ] **[GAP-F]** Them vao `src/application/use-cases/session/SessionUseCases.ts`
  - [ ] `MarkNoShowUseCase`
    - [ ] Validate: mentor owns session
    - [ ] Validate: session status in [CONFIRMED, IN_PROGRESS]
    - [ ] Validate: scheduledAt da qua (khong mark no-show truoc gio)
    - [ ] Set isNoShow, noShowMarkedBy
    - [ ] Theo OQ05.1: phat sinh payment neu fee > 0
    - [ ] Increment mentee noShowCount

### 2.7 Payment Fixes

- [ ] **[GAP-G]** Sua `src/application/use-cases/payment/PaymentUseCases.ts`
  - [ ] `InitiateSessionFeePaymentUseCase`: lay TN account tu MentorProfile
  - [ ] Fallback chain: charityAccount -> tnAccountNo -> default

- [ ] **[GAP-H]** Sua `src/application/use-cases/payment/PaymentUseCases.ts`
  - [ ] `InitiateActivationUseCase`: doc activation_amount tu SystemConfig
  - [ ] Lay default charity account tu CharityAccount (isDefault=true)

### 2.8 Stats Use Cases

- [ ] **[GAP-M]** Tao `src/application/use-cases/stats/StatsUseCases.ts`
  - [ ] `GetMenteeLearningStatsUseCase`
  - [ ] `GetMentorTeachingStatsUseCase`

### 2.9 Charity Account Use Cases

- [ ] **[GAP-I]** Tao `src/application/use-cases/admin/CharityAccountUseCases.ts`
  - [ ] `CreateCharityAccountUseCase`
  - [ ] `ListCharityAccountsUseCase`
  - [ ] `UpdateCharityAccountUseCase`
  - [ ] `DeleteCharityAccountUseCase` (validate usageCount = 0)

### 2.10 System Config Use Cases

- [ ] **[GAP-J]** Tao `src/application/use-cases/admin/SystemConfigUseCases.ts`
  - [ ] `GetSystemConfigUseCase`
  - [ ] `UpdateSystemConfigUseCase` (validate allowed keys, audit log)

### 2.11 Report Use Cases

- [ ] **[GAP-O]** Tao `src/application/use-cases/report/ReportUseCases.ts`
  - [ ] `SubmitReportUseCase`
  - [ ] `ListReportsUseCase`
  - [ ] `ResolveReportUseCase`

### 2.12 DI Container Update

- [ ] Sua `src/lib/container.ts`
  - [ ] Import va instantiate tat ca use cases moi
  - [ ] Cap nhat `UseCases` type

---

## Wave 3: Presentation Layer (API + UI)

### 3.1 API Routes Moi

- [ ] **[GAP-A]** Sua `src/app/api/mentor/apply/route.ts` (refactor dung use case)
- [ ] **[GAP-A]** Tao `src/app/api/admin/mentor-applications/route.ts` (GET)
- [ ] **[GAP-A]** Tao `src/app/api/admin/mentor-applications/[id]/route.ts` (PATCH)
- [ ] **[GAP-B]** Tao `src/app/api/mentor/[id]/public-profile/route.ts` (GET)
- [ ] **[GAP-B]** Sua `src/app/api/mentor/profile/route.ts` (refactor qua use case)
- [ ] **[GAP-D]** Tao `src/app/api/sessions/[id]/confirm-completion/route.ts` (POST)
- [ ] **[GAP-F]** Tao `src/app/api/sessions/[id]/no-show/route.ts` (POST)
- [ ] **[GAP-I]** Tao `src/app/api/admin/charity-accounts/route.ts` (GET, POST)
- [ ] **[GAP-I]** Tao `src/app/api/admin/charity-accounts/[id]/route.ts` (PATCH, DELETE)
- [ ] **[GAP-J]** Tao `src/app/api/admin/config/route.ts` (GET, PATCH)
- [ ] **[GAP-M]** Tao `src/app/api/mentee/stats/route.ts` (GET)
- [ ] **[GAP-N]** Tao `src/app/api/mentor/stats/route.ts` (GET)
- [ ] **[GAP-O]** Tao `src/app/api/reports/route.ts` (POST)
- [ ] **[GAP-O]** Tao `src/app/api/admin/reports/route.ts` (GET)
- [ ] **[GAP-O]** Tao `src/app/api/admin/reports/[id]/route.ts` (PATCH)

### 3.2 API Routes Sua doi

- [ ] **[GAP-C]** Sua `src/app/api/sessions/route.ts` (POST) - them validations
- [ ] **[GAP-E]** Sua `src/app/api/sessions/[id]/route.ts` (PATCH cancel) - late cancel logic
- [ ] **[GAP-G]** Sua `src/app/api/payments/session-fee/route.ts` - fix TN account

### 3.3 UI Components Moi

- [ ] **[GAP-A]** Tao `src/presentation/components/mentor/MentorApplicationForm.tsx`
  - [ ] Form: motivation, experience, linkedin, contact info
  - [ ] Hien thi trang thai application hien tai
  - [ ] Submit handler

- [ ] **[GAP-A]** Tao `src/presentation/components/admin/MentorApplicationsTable.tsx`
  - [ ] Table: applicant info, status, date
  - [ ] Approve/Reject actions voi confirm dialogs

- [ ] **[GAP-B]** Tao `src/presentation/components/mentor/MentorPublicProfile.tsx`
  - [ ] Header: avatar, name, headline, rating
  - [ ] Body: bio, expertise, fields, experience
  - [ ] Availability calendar
  - [ ] Stats: sessions, late cancel count
  - [ ] CTA: "Dat lich hoc" button

- [ ] **[GAP-I]** Tao `src/presentation/components/admin/CharityAccountManager.tsx`
  - [ ] Table: name, accountNo, bank, status, usage count
  - [ ] Add form
  - [ ] Edit/Deactivate/Delete actions

- [ ] **[GAP-J]** Tao `src/presentation/components/admin/SystemConfigPanel.tsx`
  - [ ] Key-value editor cho cac config
  - [ ] Validation + Save

- [ ] **[GAP-O]** Tao `src/presentation/components/review/ReportForm.tsx`
  - [ ] Reason dropdown, description textarea
  - [ ] Gop vao review flow

### 3.4 UI Components Sua doi

- [ ] **[GAP-D]** Sua `src/presentation/components/session/SessionCard.tsx`
  - [ ] Them dual confirmation UI (confirm buttons cho ca 2)
  - [ ] Hien thi confirmation state
  - [ ] Mentor: input field cho Google Meet link khi confirm

- [ ] **[GAP-F]** Sua `src/presentation/components/session/SessionCard.tsx`
  - [ ] Them "Danh dau vang mat" button cho mentor (sau gio hoc)
  - [ ] Confirm dialog truoc khi mark no-show

- [ ] **[GAP-L]** Sua `src/presentation/components/session/SessionCard.tsx`
  - [ ] Mentor confirm: them input Google Meet link
  - [ ] Validate URL format

- [ ] **[GAP-P]** Sua `src/presentation/components/settings/SettingsForm.tsx`
  - [ ] Hien thi late cancellation count
  - [ ] Hien thi no-show count (neu la mentee)

### 3.5 Pages Moi

- [ ] **[GAP-A]** Tao `src/app/(dashboard)/dashboard/mentee/apply-mentor/page.tsx`
- [ ] **[GAP-A]** Tao `src/app/(dashboard)/dashboard/admin/mentor-applications/page.tsx`
- [ ] **[GAP-B]** Tao `src/app/(dashboard)/dashboard/mentee/mentor/[id]/page.tsx`
- [ ] **[GAP-I]** Tao `src/app/(dashboard)/dashboard/admin/charity-accounts/page.tsx`
- [ ] **[GAP-J]** Tao `src/app/(dashboard)/dashboard/admin/config/page.tsx`
- [ ] **[GAP-O]** Tao `src/app/(dashboard)/dashboard/admin/reports/page.tsx`

### 3.6 Pages Sua doi

- [ ] **[GAP-N]** Sua `src/app/(dashboard)/dashboard/mentor/page.tsx` - real stats
- [ ] **[GAP-M]** Sua `src/app/(dashboard)/dashboard/mentee/page.tsx` - real stats
- [ ] Sua `src/presentation/components/layout/Sidebar.tsx`
  - [ ] Fix dead links (`/dashboard/admin/stats`, `/dashboard/mentee/impact`)
  - [ ] Them menu: "Ho so Mentor" (apply), "Quan ly TK thien nguyen", "Cau hinh", "Don dang ky Mentor", "Bao cao"

---

## Wave 4: Testing

### 4.1 Unit Tests

- [ ] Tao `src/__tests__/unit/domain/value-objects/CancellationPolicy.test.ts`
- [ ] Tao `src/__tests__/unit/domain/value-objects/BookingPolicy.test.ts`
- [ ] Tao `src/__tests__/unit/application/MentorApplicationUseCases.test.ts`
- [ ] Tao `src/__tests__/unit/application/MentorProfileUseCases.test.ts`
- [ ] Tao `src/__tests__/unit/application/BookingValidations.test.ts`
- [ ] Tao `src/__tests__/unit/application/CancellationRules.test.ts`
- [ ] Tao `src/__tests__/unit/application/DualConfirmation.test.ts`
- [ ] Tao `src/__tests__/unit/application/NoShowUseCases.test.ts`
- [ ] Tao `src/__tests__/unit/application/CharityAccountUseCases.test.ts`
- [ ] Tao `src/__tests__/unit/application/SystemConfigUseCases.test.ts`
- [ ] Tao `src/__tests__/unit/application/StatsUseCases.test.ts`
- [ ] Tao `src/__tests__/unit/application/ReportUseCases.test.ts`
- [ ] Tao `src/__tests__/unit/application/PaymentFix.test.ts`

### 4.2 Integration Tests

- [ ] Tao `src/__tests__/integration/repositories/PrismaMentorApplicationRepo.test.ts`
- [ ] Tao `src/__tests__/integration/repositories/PrismaCharityAccountRepo.test.ts`
- [ ] Tao `src/__tests__/integration/repositories/PrismaSystemConfigRepo.test.ts`
- [ ] Tao `src/__tests__/integration/repositories/PrismaReportRepo.test.ts`
- [ ] Sua `src/__tests__/integration/repositories/PrismaPaymentSessionRepo.test.ts` (them methods moi)

### 4.3 API Tests

- [ ] Tao `src/__tests__/integration/api/MentorApplicationApi.test.ts`
- [ ] Tao `src/__tests__/integration/api/CharityAccountApi.test.ts`
- [ ] Tao `src/__tests__/integration/api/SystemConfigApi.test.ts`
- [ ] Sua `src/__tests__/integration/api/ApiRoutes.test.ts` (them booking validation tests)

### 4.4 E2E Tests

- [ ] Tao `src/__tests__/e2e/MentorApplicationJourney.test.ts`
- [ ] Tao `src/__tests__/e2e/BookingWithValidations.test.ts`
- [ ] Tao `src/__tests__/e2e/CancellationJourney.test.ts`
- [ ] Tao `src/__tests__/e2e/DualConfirmJourney.test.ts`

### 4.5 Regression

- [ ] Chay `npm test` - dam bao tat ca 247 tests cu van pass
- [ ] Chay `npm run build` - dam bao build thanh cong
- [ ] Chay `npm run lint` - dam bao khong co linting errors

---

## Wave 5: Polish & Cleanup

### 5.1 Technical Debt

- [ ] Xoa/cleanup mock data trong mentor dashboard
- [ ] Xoa/cleanup mock data trong mentee dashboard
- [ ] Fix admin stats "change" text (compute real values hoac bo)
- [ ] Wire mobile sidebar toggle trong TopBar
- [ ] Fix dead nav links trong Sidebar
- [ ] Bo unused GoogleMeetService stub (hoac giu deprecated)

### 5.2 Documentation

- [ ] Cap nhat `README.md` voi features moi
- [ ] Cap nhat `src/__tests__/README.md` voi test cases moi
- [ ] Them API documentation (co the dung Swagger/OpenAPI sau)

---

## Summary

| Wave | So tasks | Estimated |
|------|---------|-----------|
| Wave 1: Foundation | 32 tasks | 3-4 ngay |
| Wave 2: Core Business | 35 tasks | 5-7 ngay |
| Wave 3: Presentation | 32 tasks | 5-7 ngay |
| Wave 4: Testing | 20 tasks | 3-4 ngay |
| Wave 5: Polish | 8 tasks | 1-2 ngay |
| **Tong** | **127 tasks** | **17-24 ngay** |

---

## Tham chieu

- Gap Analysis: `docs/gap-analysis.md`
- Development Plan: `docs/development-plan.md`
- Schema Changes: `docs/schema-changes.md`
- API Plan: `docs/api-plan.md`
- Feature List: (provided by Founder)
- Business Rules: (provided by Founder)
- Open Questions: (provided by Founder)
