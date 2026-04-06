# HocTuThien - Implementation Checklist

**Project:** HocTuThien
**Date:** 27/03/2026 (cập nhật: 29/03/2026)
**Version:** v0.2

---

## Cách sử dụng

- [ ] = Chưa làm
- [x] = Đã hoàn thành
- Mỗi task có reference đến Gap ID (xem `gap-analysis.md`) và file cần tạo/sửa

---

## Wave 1: Foundation (Domain + Infrastructure)

### 1.1 Schema Migration

- [x] **[GAP-I]** Thêm model `CharityAccount` vào `prisma/schema.prisma`
- [x] **[GAP-J]** Thêm model `SystemConfig` vào `prisma/schema.prisma`
- [x] **[GAP-O]** Thêm model `Report` vào `prisma/schema.prisma`
- [x] **[GAP-D]** Thêm fields `mentorConfirmed`, `menteeConfirmed` vào `LearningSession`
- [x] **[GAP-E]** Thêm field `isLateCancellation` vào `LearningSession`
- [x] **[GAP-F]** Thêm fields `isNoShow`, `noShowMarkedBy` vào `LearningSession`
- [x] **[GAP-E]** Thêm field `lateCancellationCount` vào `User`
- [x] **[GAP-F]** Thêm field `noShowCount` vào `MenteeProfile`
- [x] **[GAP-B]** Thêm fields `charityAccountId`, `onlyActivatedMentee` vào `MentorProfile`
- [x] **[GAP-O]** Thêm relations `reportsMade`, `reportsReceived` vào `User`
- [ ] Thêm indexes cần thiết (xem `schema-changes.md` Section 6)
- [x] Chạy `npx prisma migrate dev --name add_charity_config_report_models`
- [ ] Cập nhật `prisma/seed.ts` với default CharityAccount và SystemConfig
- [ ] Chạy `npm run prisma:seed` để seed data mới

### 1.2 Domain Layer - Value Objects

- [x] **[GAP-E]** Tạo `src/domain/value-objects/CancellationPolicy.ts`
  - [x] Function `evaluateCancellation(scheduledAt, cancelAt, thresholdMinutes)`
  - [x] Interface `CancellationResult { canCancel, isLateCancellation, reason }`
  - [x] Constant `LATE_CANCEL_THRESHOLD_MINUTES = 30`

- [x] **[GAP-C]** Tạo `src/domain/value-objects/BookingPolicy.ts`
  - [x] Function `validateBookingEligibility(params)`
  - [x] Interface `BookingValidationResult { canBook, reasons }`
  - [x] Constants: `MIN_ADVANCE_BOOKING_HOURS`, `MAX_ACTIVE_BOOKINGS`, `VALID_DURATIONS_HOURS`

- [x] **[GAP-F]** Sửa `src/domain/value-objects/Payment.ts`
  - [x] Thêm `NO_SHOW` vào `SessionStatus` enum
  - [x] Thêm label và color cho NO_SHOW

### 1.3 Domain Layer - Repository Interfaces

- [x] **[GAP-A]** Tạo `src/domain/repositories/IMentorApplicationRepository.ts`
  - [x] `findById`, `findByUserId`, `findAll`, `create`, `updateStatus`

- [x] **[GAP-I]** Tạo `src/domain/repositories/ICharityAccountRepository.ts`
  - [x] `findById`, `findByAccountNo`, `findAll`, `findDefault`, `create`, `update`, `deactivate`, `delete`, `getUsageCount`

- [x] **[GAP-J]** Tạo `src/domain/repositories/ISystemConfigRepository.ts`
  - [x] `get`, `getAll`, `set`, `setMultiple`

- [x] **[GAP-O]** Tạo `src/domain/repositories/IReportRepository.ts`
  - [x] `findById`, `findAll`, `create`, `updateStatus`

- [x] **[GAP-C,D,F]** Sửa `src/domain/repositories/ISessionRepository.ts`
  - [x] Thêm `findActiveByMenteeId(menteeId)`
  - [x] Thêm `countActiveByMenteeId(menteeId)`
  - [x] Thêm `findConflictingSession(mentorId, scheduledAt, durationMinutes)`
  - [x] Thêm `updateConfirmation(id, confirmedBy)`
  - [x] Thêm `markNoShow(id, markedBy)` (via `updateStatus` với `isNoShow: true`)

### 1.4 Infrastructure Layer - Repository Implementations

- [x] **[GAP-A]** Tạo `src/infrastructure/database/repositories/PrismaMentorApplicationRepository.ts`
  - [x] Implement tất cả IMentorApplicationRepository methods
  - [x] Include user info (name, email, image) khi query

- [x] **[GAP-I]** Tạo `src/infrastructure/database/repositories/PrismaCharityAccountRepository.ts`
  - [x] Implement tất cả ICharityAccountRepository methods
  - [x] `getUsageCount()`: đếm MentorProfile + Payment references
  - [x] `delete()`: throw error nếu usageCount > 0

- [x] **[GAP-J]** Tạo `src/infrastructure/database/repositories/PrismaSystemConfigRepository.ts`
  - [x] Implement tất cả ISystemConfigRepository methods
  - [x] Upsert pattern cho `set()`

- [x] **[GAP-O]** Tạo `src/infrastructure/database/repositories/PrismaReportRepository.ts`
  - [x] Implement tất cả IReportRepository methods
  - [x] Include reporter + reported user info

- [x] **[GAP-C,D,F]** Sửa `src/infrastructure/database/repositories/PrismaPaymentSessionRepositories.ts`
  - [x] Implement `findActiveByMenteeId`
  - [x] Implement `countActiveByMenteeId`
  - [x] Implement `findConflictingSession`
  - [x] Implement `updateConfirmation`
  - [x] Implement no-show via `updateStatus` với `isNoShow: true`

### 1.5 Infrastructure - Unit of Work

- [x] Sửa `src/infrastructure/unit-of-work/PrismaUnitOfWork.ts`
  - [x] Thêm `get mentorApplications(): IMentorApplicationRepository`
  - [x] Thêm `get charityAccounts(): ICharityAccountRepository`
  - [x] Thêm `get systemConfig(): ISystemConfigRepository`
  - [x] Thêm `get reports(): IReportRepository`

### 1.6 Infrastructure - External Services

- [x] **[GAP-L]** Sửa `src/infrastructure/external/GoogleMeetService.ts`
  - [x] Thêm `validateMeetLink(url): boolean` function
  - [x] `generateMeetLink()` giữ lại cho backward compat (test stub)

---

## Wave 2: Core Business Logic (Application Layer)

### 2.1 Mentor Application Use Cases

- [x] **[GAP-A]** Tạo `src/application/use-cases/mentor/MentorApplicationUseCases.ts`
  - [x] `SubmitMentorApplicationUseCase`
  - [x] `ListMentorApplicationsUseCase`
  - [x] `ApproveMentorApplicationUseCase`
  - [x] `RejectMentorApplicationUseCase`

### 2.2 Mentor Profile Use Cases

- [x] **[GAP-B]** Tạo `src/application/use-cases/mentor/MentorProfileUseCases.ts`
  - [x] `UpdateMentorProfileUseCase`
  - [x] `SetTeachingFieldsUseCase`
  - [x] `GetMentorPublicProfileUseCase` *(bug fix 29/03: component đã dùng đúng cấu trúc dữ liệu)*

### 2.3 Booking Validations (Sửa Use Case hiện tại)

- [x] **[GAP-C]** Sửa `src/application/use-cases/session/SessionUseCases.ts` - BookSessionUseCase
  - [x] Check activation cho paid session (BR03)
  - [x] Cho phép unactivated mentee đặt free session (BR04)
  - [x] Max active bookings từ SystemConfig (BR05)
  - [x] Minimum advance booking time từ SystemConfig (BR10)
  - [x] Duration must be whole hours (BR11)
  - [x] Schedule conflict detection
  - [x] Check mentor.onlyActivatedMentee (BR06)
  - [x] Check outstanding payment (BR09)

### 2.4 Dual Confirmation

- [x] **[GAP-D]** `ConfirmCompletionUseCase` trong `SessionUseCases.ts`
  - [x] Logic dual confirm: mentor/mentee set confirmed flag
  - [x] Khi cả 2 true → COMPLETED hoặc PAYMENT_PENDING
  - [x] Mentor nhập meetLink khi confirm

### 2.5 Cancellation Rules

- [x] **[GAP-E]** `CancelSessionUseCase` trong `SessionUseCases.ts`
  - [x] Đọc `late_cancel_threshold` từ SystemConfig
  - [x] Set `isLateCancellation` = true nếu <= threshold
  - [x] Increment `lateCancellationCount`

### 2.6 No-show Handling

- [x] **[GAP-F]** `MarkNoShowUseCase` trong `SessionUseCases.ts`
  - [x] Validate: mentor owns session, status in [CONFIRMED, IN_PROGRESS]
  - [x] Validate: scheduledAt đã qua
  - [x] Set isNoShow, noShowMarkedBy
  - [x] Phát sinh PAYMENT_PENDING nếu fee > 0 (theo OQ05.1)
  - [x] Increment mentee noShowCount

### 2.7 Payment Fixes

- [x] **[GAP-G/H]** Sửa `PaymentUseCases.ts`
  - [x] `InitiateActivationUseCase`: đọc activation_amount từ SystemConfig
  - [x] Lấy default charity account từ `CharityAccount` (isDefault=true)
  - [ ] Xác nhận lại fallback chain cho `InitiateSessionFeePaymentUseCase`

### 2.8 Stats Use Cases

- [x] **[GAP-M/N]** Tạo `src/application/use-cases/stats/StatsUseCases.ts`
  - [x] `GetMenteeLearningStatsUseCase`
  - [x] `GetMentorTeachingStatsUseCase`

### 2.9 Charity Account Use Cases

- [x] **[GAP-I]** Tạo `src/application/use-cases/admin/CharityAccountUseCases.ts`
  - [x] `CreateCharityAccountUseCase`
  - [x] `ListCharityAccountsUseCase`
  - [x] `UpdateCharityAccountUseCase`
  - [x] `DeleteCharityAccountUseCase`

### 2.10 System Config Use Cases

- [x] **[GAP-J]** Tạo `src/application/use-cases/admin/SystemConfigUseCases.ts`
  - [x] `GetSystemConfigUseCase`
  - [x] `UpdateSystemConfigUseCase`

### 2.11 Report Use Cases

- [x] **[GAP-O]** Tạo `src/application/use-cases/report/ReportUseCases.ts`
  - [x] `SubmitReportUseCase`
  - [x] `ListReportsUseCase`
  - [x] `ResolveReportUseCase`

### 2.12 DI Container Update

- [x] Sửa `src/lib/container.ts`
  - [x] Import và instantiate tất cả use cases mới

---

## Wave 3: Presentation Layer (API + UI)

### 3.1 API Routes Mới

- [x] **[GAP-A]** Sửa `src/app/api/mentor/apply/route.ts` (dùng use case)
- [x] **[GAP-A]** Tạo `src/app/api/admin/applications/route.ts` (GET)
- [x] **[GAP-A]** Tạo `src/app/api/admin/applications/[id]/route.ts` (PATCH)
- [x] **[GAP-B]** Tạo `src/app/api/mentor/[id]/public-profile/route.ts` (GET)
- [x] **[GAP-B]** `src/app/api/mentor/profile/route.ts` (dùng use case)
- [x] **[GAP-D]** Tạo `src/app/api/sessions/[id]/confirm-completion/route.ts` (POST)
- [x] **[GAP-F]** Tạo `src/app/api/sessions/[id]/no-show/route.ts` (POST)
- [x] **[GAP-I]** Tạo `src/app/api/admin/charity-accounts/route.ts` (GET, POST)
- [x] **[GAP-I]** Tạo `src/app/api/admin/charity-accounts/[id]/route.ts` (PATCH, DELETE)
- [x] **[GAP-J]** Tạo `src/app/api/admin/config/route.ts` (GET, PATCH)
- [x] **[GAP-M]** Tạo `src/app/api/mentee/stats/route.ts` (GET)
- [x] **[GAP-N]** Tạo `src/app/api/mentor/stats/route.ts` (GET)
- [x] **[GAP-O]** Tạo `src/app/api/reports/route.ts` (POST)
- [x] **[GAP-O]** Tạo `src/app/api/admin/reports/route.ts` (GET)
- [x] **[GAP-O]** Tạo `src/app/api/admin/reports/[id]/route.ts` (PATCH)

### 3.2 API Routes Sửa đổi

- [x] **[GAP-C]** `src/app/api/sessions/route.ts` (POST) - booking validations đầy đủ
- [x] **[GAP-E]** `src/app/api/sessions/[id]/route.ts` (PATCH cancel) - late cancel logic
- [ ] **[GAP-G]** Xác nhận lại `src/app/api/payments/session-fee/route.ts` fallback chain

### 3.3 UI Components Mới

- [x] **[GAP-A]** Tạo `src/presentation/components/mentor/MentorApplicationForm.tsx`
- [x] **[GAP-B]** Tạo `src/presentation/components/mentor/MentorPublicProfile.tsx`
  - [x] Header: avatar, name, headline, rating
  - [x] Body: bio (expertise), fields, experience
  - [x] Sidebar: charity account info, availability slot count
  - [x] CTA: "Kết nối & Đặt lịch" button (khi isAvailable=true)
  - [x] Booking modal tích hợp với date/time picker và form (29/03 fix)

### 3.4 UI Components Sửa đổi

- [x] **[GAP-P]** Sửa `src/presentation/components/settings/SettingsForm.tsx`
  - [x] Hiển thị `lateCancellationCount`
  - [x] Hiển thị `noShowCount` (nếu là mentee)
  - [x] Hiển thị `lateCancellationCount` trên `MentorPublicProfile.tsx`

### 3.5 Pages Mới

- [x] **[GAP-A]** Tạo `src/app/(dashboard)/dashboard/mentee/apply-mentor/page.tsx`
- [x] **[GAP-A]** Tạo `src/app/(dashboard)/dashboard/admin/applications/page.tsx`
- [x] **[GAP-B]** Tạo `src/app/(dashboard)/dashboard/mentee/mentor/[id]/page.tsx`
- [x] **[GAP-I]** Tạo `src/app/(dashboard)/dashboard/admin/charity-accounts/page.tsx`
- [x] **[GAP-J]** Tạo `src/app/(dashboard)/dashboard/admin/config/page.tsx`
- [x] **[GAP-O]** Tạo `src/app/(dashboard)/dashboard/admin/reports/page.tsx`

### 3.6 Pages Sửa đổi

- [x] **[GAP-N]** Sửa `src/app/(dashboard)/dashboard/mentor/page.tsx` - real stats
- [x] **[GAP-M]** Sửa `src/app/(dashboard)/dashboard/mentee/page.tsx` - real stats

---

## Wave 4: Testing

### 4.1 Unit Tests

- [x] Tạo `src/__tests__/unit/domain/value-objects/CancellationPolicy.test.ts`
- [x] Tạo `src/__tests__/unit/domain/value-objects/BookingPolicy.test.ts`
- [x] Tạo `src/__tests__/unit/application/use-cases/MentorUseCases.test.ts` (ApplyForMentor + GetMentorSessions)
- [x] Tạo `src/__tests__/unit/infrastructure/repositories/PrismaMentorApplicationRepository.test.ts`
- [x] Tạo `src/__tests__/unit/application/use-cases/CharityAccountVerificationUseCases.test.ts`
- [x] Tạo `src/__tests__/unit/application/use-cases/StatsUseCases.test.ts`
- [x] Tạo `src/__tests__/unit/infrastructure/repositories/PrismaCharityAccountRepository.test.ts`
- [x] Tạo `src/__tests__/unit/infrastructure/repositories/PrismaSystemConfigRepository.test.ts`
- [x] Tạo `src/__tests__/unit/infrastructure/repositories/PrismaReportRepository.test.ts`
- [ ] Tạo `src/__tests__/unit/application/use-cases/MentorProfileUseCases.test.ts` (GetMentorPublicProfileUseCase riêng)
- [x] Tạo `src/__tests__/unit/application/use-cases/ReportUseCases.test.ts` (riêng biệt) — 25 tests

### 4.2 Integration Tests

- [x] `src/__tests__/integration/repositories/PrismaPaymentSessionRepo.test.ts` (đã có methods mới)
- [x] `src/__tests__/integration/api/CharityAccountVerificationApiRoutes.test.ts`
- [ ] Tạo `src/__tests__/integration/repositories/PrismaMentorApplicationRepo.test.ts`
- [ ] Tạo `src/__tests__/integration/repositories/PrismaCharityAccountRepo.test.ts`
- [ ] Tạo `src/__tests__/integration/repositories/PrismaSystemConfigRepo.test.ts`
- [ ] Tạo `src/__tests__/integration/repositories/PrismaReportRepo.test.ts`

### 4.3 API Tests

- [ ] Sửa `src/__tests__/integration/api/ApiRoutes.test.ts` (thêm booking validation tests)

### 4.4 E2E Tests (Jest-based)

- [x] Tạo `src/__tests__/e2e/UserJourney.test.ts`
- [x] Tạo `src/__tests__/e2e/FullFlowTests.test.ts` (4 scenarios: Mentee, Mentor, Admin, Cross-role)
- [x] Cập nhật `jest.config.js` để include e2e tests
- [x] Cập nhật `helpers.ts`: `buildSessionRecord` đầy đủ tất cả trường của `SessionRecord`

### 4.5 Regression

- [x] Chạy `npm test` - **547 tests pass** (tăng từ 247)
- [x] Chạy `npm run build` (TypeScript: 0 errors)
- [x] Chạy `npm run lint` - 0 ESLint warnings/errors

---

## Wave 5: Polish & Cleanup

### 5.1 Technical Debt

- [x] Mentor dashboard sử dụng real stats từ `GetMentorTeachingStatsUseCase`
- [x] Mentee dashboard sử dụng real stats từ `GetMenteeLearningStatsUseCase`
- [ ] Fix admin stats "change" text (compute real values hoặc bỏ)
- [ ] Wire mobile sidebar toggle trong TopBar
- [ ] Bỏ unused GoogleMeetService stub (hoặc giữ deprecated)

### 5.2 Documentation

- [x] Cập nhật `docs/gap-analysis.md` (v0.2 – 29/03/2026)
- [x] Cập nhật `docs/implementation-checklist.md` (v0.2 – 29/03/2026)
- [ ] Cập nhật `README.md` với features mới
- [ ] Cập nhật `src/__tests__/README.md` với test count mới (483 tests)

---

## Summary (cập nhật 06/04/2026)

| Wave | Tổng tasks | Đã done | Còn lại |
|------|-----------|---------|---------|
| Wave 1: Foundation | 32 tasks | 30 | 2 |
| Wave 2: Core Business | 35 tasks | 33 | 2 |
| Wave 3: Presentation | 32 tasks | 28 | 4 |
| Wave 4: Testing | 20 tasks | 16 | 4 |
| Wave 5: Polish | 8 tasks | 3 | 5 |
| **Tổng** | **127 tasks** | **~110** | **~17** |

**Tiến độ: ~87% hoàn thành** (tăng từ 83%)

---

## Tham chiếu

- Gap Analysis: `docs/gap-analysis.md`
- Development Plan: `docs/development-plan.md`
- Schema Changes: `docs/schema-changes.md`
- API Plan: `docs/api-plan.md`
- Feature List: (provided by Founder)
- Business Rules: (provided by Founder)
- Open Questions: (provided by Founder)