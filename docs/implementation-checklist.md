# HocTuThien - Implementation Checklist

**Project:** HocTuThien
**Date:** 27/03/2026
**Version:** v0.1

---

## Cách sử dụng

- [ ] = Chưa làm
- [x] = Đã hoàn thành
- Mỗi task có reference đến Gap ID (xem `gap-analysis.md`) và file cần tạo/sửa

---

## Wave 1: Foundation (Domain + Infrastructure)

### 1.1 Schema Migration

- [ ] **[GAP-I]** Thêm model `CharityAccount` vào `prisma/schema.prisma`
- [ ] **[GAP-J]** Thêm model `SystemConfig` vào `prisma/schema.prisma`
- [ ] **[GAP-O]** Thêm model `Report` vào `prisma/schema.prisma`
- [ ] **[GAP-D]** Thêm fields `mentorConfirmed`, `menteeConfirmed` vào `LearningSession`
- [ ] **[GAP-E]** Thêm field `isLateCancellation` vào `LearningSession`
- [ ] **[GAP-F]** Thêm fields `isNoShow`, `noShowMarkedBy` vào `LearningSession`
- [ ] **[GAP-E]** Thêm field `lateCancellationCount` vào `User`
- [ ] **[GAP-F]** Thêm field `noShowCount` vào `MenteeProfile`
- [ ] **[GAP-B]** Thêm fields `charityAccountId`, `onlyActivatedMentee` vào `MentorProfile`
- [ ] **[GAP-O]** Thêm relations `reportsMade`, `reportsReceived` vào `User`
- [ ] Thêm indexes cần thiết (xem `schema-changes.md` Section 6)
- [ ] Chạy `npx prisma migrate dev --name add_charity_config_report_models`
- [ ] Cập nhật `prisma/seed.ts` với default CharityAccount và SystemConfig
- [ ] Chạy `npm run prisma:seed` để seed data mới

### 1.2 Domain Layer - Value Objects

- [ ] **[GAP-E]** Tạo `src/domain/value-objects/CancellationPolicy.ts`
  - [ ] Function `evaluateCancellation(scheduledAt, cancelAt, thresholdMinutes)`
  - [ ] Interface `CancellationResult { canCancel, isLateCancellation, reason }`
  - [ ] Constant `LATE_CANCEL_THRESHOLD_MINUTES = 30`

- [ ] **[GAP-C]** Tạo `src/domain/value-objects/BookingPolicy.ts`
  - [ ] Function `validateBookingEligibility(params)`
  - [ ] Interface `BookingValidationResult { canBook, reasons }`
  - [ ] Constants: `MIN_ADVANCE_BOOKING_HOURS`, `MAX_ACTIVE_BOOKINGS`, `VALID_DURATIONS_HOURS`

- [ ] **[GAP-F]** Sửa `src/domain/value-objects/Payment.ts`
  - [ ] Thêm `NO_SHOW` vào `SessionStatus` enum
  - [ ] Thêm label và color cho NO_SHOW

### 1.3 Domain Layer - Repository Interfaces

- [ ] **[GAP-A]** Tạo `src/domain/repositories/IMentorApplicationRepository.ts`
  - [ ] `findById`, `findByUserId`, `findAll`, `create`, `updateStatus`

- [ ] **[GAP-I]** Tạo `src/domain/repositories/ICharityAccountRepository.ts`
  - [ ] `findById`, `findByAccountNo`, `findAll`, `findDefault`, `create`, `update`, `deactivate`, `delete`, `getUsageCount`

- [ ] **[GAP-J]** Tạo `src/domain/repositories/ISystemConfigRepository.ts`
  - [ ] `get`, `getAll`, `set`, `setMultiple`

- [ ] **[GAP-O]** Tạo `src/domain/repositories/IReportRepository.ts`
  - [ ] `findById`, `findAll`, `create`, `updateStatus`

- [ ] **[GAP-C,D,F]** Sửa `src/domain/repositories/ISessionRepository.ts`
  - [ ] Thêm `findActiveByMenteeId(menteeId)`
  - [ ] Thêm `countActiveByMenteeId(menteeId)`
  - [ ] Thêm `findConflictingSession(mentorId, scheduledAt, durationMinutes)`
  - [ ] Thêm `updateConfirmation(id, confirmedBy)`
  - [ ] Thêm `markNoShow(id, markedBy)`

### 1.4 Infrastructure Layer - Repository Implementations

- [ ] **[GAP-A]** Tạo `src/infrastructure/database/repositories/PrismaMentorApplicationRepository.ts`
  - [ ] Implement tất cả IMentorApplicationRepository methods
  - [ ] Include user info (name, email, image) khi query

- [ ] **[GAP-I]** Tạo `src/infrastructure/database/repositories/PrismaCharityAccountRepository.ts`
  - [ ] Implement tất cả ICharityAccountRepository methods
  - [ ] `getUsageCount()`: đếm MentorProfile + Payment references
  - [ ] `delete()`: throw error nếu usageCount > 0

- [ ] **[GAP-J]** Tạo `src/infrastructure/database/repositories/PrismaSystemConfigRepository.ts`
  - [ ] Implement tất cả ISystemConfigRepository methods
  - [ ] Upsert pattern cho `set()`

- [ ] **[GAP-O]** Tạo `src/infrastructure/database/repositories/PrismaReportRepository.ts`
  - [ ] Implement tất cả IReportRepository methods
  - [ ] Include reporter + reported user info

- [ ] **[GAP-C,D,F]** Sửa `src/infrastructure/database/repositories/PrismaPaymentSessionRepositories.ts`
  - [ ] Implement `findActiveByMenteeId`
  - [ ] Implement `countActiveByMenteeId`
  - [ ] Implement `findConflictingSession`
  - [ ] Implement `updateConfirmation`
  - [ ] Implement `markNoShow`

### 1.5 Infrastructure - Unit of Work

- [ ] Sửa `src/infrastructure/unit-of-work/PrismaUnitOfWork.ts`
  - [ ] Thêm `get mentorApplications(): IMentorApplicationRepository`
  - [ ] Thêm `get charityAccounts(): ICharityAccountRepository`
  - [ ] Thêm `get systemConfig(): ISystemConfigRepository`
  - [ ] Thêm `get reports(): IReportRepository`

### 1.6 Infrastructure - External Services

- [ ] **[GAP-L]** Sửa `src/infrastructure/external/GoogleMeetService.ts`
  - [ ] Thêm `validateMeetLink(url): boolean` function
  - [ ] Deprecate `generateMeetLink()` (giữ lại để không break tests)

---

## Wave 2: Core Business Logic (Application Layer)

### 2.1 Mentor Application Use Cases

- [ ] **[GAP-A]** Tạo `src/application/use-cases/mentor/MentorApplicationUseCases.ts`
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

- [ ] **[GAP-B]** Tạo `src/application/use-cases/mentor/MentorProfileUseCases.ts`
  - [ ] `UpdateMentorProfileUseCase`
    - [ ] Validate: user is MENTOR
    - [ ] Validate: charityAccountId thuộc active accounts (BR08)
    - [ ] Audit log với old/new values
  - [ ] `SetTeachingFieldsUseCase`
    - [ ] So sánh old vs new fields
    - [ ] Ghi nhận thay đổi cho admin review (BR30)
  - [ ] `GetMentorPublicProfileUseCase`
    - [ ] Return profile + user info + fields + availability + stats

### 2.3 Booking Validations (Sửa Use Case hiện tại)

- [ ] **[GAP-C]** Sửa `src/application/use-cases/session/SessionUseCases.ts` - BookSessionUseCase
  - [ ] Thêm check: activation required cho paid session (BR03)
  - [ ] Thêm check: unactivated mentee allowed cho free session (BR04)
  - [ ] Thêm check: max active bookings (BR05)
  - [ ] Thêm check: minimum advance booking time (BR10)
  - [ ] Thêm check: duration must be whole hours (BR11)
  - [ ] Thêm check: schedule conflict detection
  - [ ] Thêm check: mentor.isAvailable
  - [ ] Thêm check: mentor.onlyActivatedMentee (BR06)
  - [ ] Đọc các config từ SystemConfig thay vì hardcoded

### 2.4 Dual Confirmation (Sửa/Thêm Use Case)

- [ ] **[GAP-D]** Sửa `src/application/use-cases/session/SessionUseCases.ts`
  - [ ] Refactor `CompleteSessionUseCase` -> `ConfirmCompletionUseCase`
  - [ ] Logic: nhận userId, xác định role (mentor/mentee)
  - [ ] Set mentorConfirmed hoặc menteeConfirmed
  - [ ] Khi cả 2 true: chuyển status tương ứng
  - [ ] Mentor có thể nhập meetLink khi confirm

### 2.5 Cancellation Rules (Sửa Use Case hiện tại)

- [ ] **[GAP-E]** Sửa `src/application/use-cases/session/SessionUseCases.ts` - CancelSessionUseCase
  - [ ] Đọc late_cancel_threshold từ SystemConfig
  - [ ] Calculate minutesBeforeStart
  - [ ] Set isLateCancellation = true nếu <= threshold
  - [ ] Increment user.lateCancellationCount

### 2.6 No-show Handling

- [ ] **[GAP-F]** Thêm vào `src/application/use-cases/session/SessionUseCases.ts`
  - [ ] `MarkNoShowUseCase`
    - [ ] Validate: mentor owns session
    - [ ] Validate: session status in [CONFIRMED, IN_PROGRESS]
    - [ ] Validate: scheduledAt đã qua (không mark no-show trước giờ)
    - [ ] Set isNoShow, noShowMarkedBy
    - [ ] Theo OQ05.1: phát sinh payment nếu fee > 0
    - [ ] Increment mentee noShowCount

### 2.7 Payment Fixes

- [ ] **[GAP-G]** Sửa `src/application/use-cases/payment/PaymentUseCases.ts`
  - [ ] `InitiateSessionFeePaymentUseCase`: lấy TN account từ MentorProfile
  - [ ] Fallback chain: charityAccount -> tnAccountNo -> default

- [ ] **[GAP-H]** Sửa `src/application/use-cases/payment/PaymentUseCases.ts`
  - [ ] `InitiateActivationUseCase`: đọc activation_amount từ SystemConfig
  - [ ] Lấy default charity account từ CharityAccount (isDefault=true)

### 2.8 Stats Use Cases

- [ ] **[GAP-M]** Tạo `src/application/use-cases/stats/StatsUseCases.ts`
  - [ ] `GetMenteeLearningStatsUseCase`
  - [ ] `GetMentorTeachingStatsUseCase`

### 2.9 Charity Account Use Cases

- [ ] **[GAP-I]** Tạo `src/application/use-cases/admin/CharityAccountUseCases.ts`
  - [ ] `CreateCharityAccountUseCase`
  - [ ] `ListCharityAccountsUseCase`
  - [ ] `UpdateCharityAccountUseCase`
  - [ ] `DeleteCharityAccountUseCase` (validate usageCount = 0)

### 2.10 System Config Use Cases

- [ ] **[GAP-J]** Tạo `src/application/use-cases/admin/SystemConfigUseCases.ts`
  - [ ] `GetSystemConfigUseCase`
  - [ ] `UpdateSystemConfigUseCase` (validate allowed keys, audit log)

### 2.11 Report Use Cases

- [ ] **[GAP-O]** Tạo `src/application/use-cases/report/ReportUseCases.ts`
  - [ ] `SubmitReportUseCase`
  - [ ] `ListReportsUseCase`
  - [ ] `ResolveReportUseCase`

### 2.12 DI Container Update

- [ ] Sửa `src/lib/container.ts`
  - [ ] Import và instantiate tất cả use cases mới
  - [ ] Cập nhật `UseCases` type

---

## Wave 3: Presentation Layer (API + UI)

### 3.1 API Routes Mới

- [ ] **[GAP-A]** Sửa `src/app/api/mentor/apply/route.ts` (refactor dùng use case)
- [ ] **[GAP-A]** Tạo `src/app/api/admin/mentor-applications/route.ts` (GET)
- [ ] **[GAP-A]** Tạo `src/app/api/admin/mentor-applications/[id]/route.ts` (PATCH)
- [ ] **[GAP-B]** Tạo `src/app/api/mentor/[id]/public-profile/route.ts` (GET)
- [ ] **[GAP-B]** Sửa `src/app/api/mentor/profile/route.ts` (refactor qua use case)
- [ ] **[GAP-D]** Tạo `src/app/api/sessions/[id]/confirm-completion/route.ts` (POST)
- [ ] **[GAP-F]** Tạo `src/app/api/sessions/[id]/no-show/route.ts` (POST)
- [ ] **[GAP-I]** Tạo `src/app/api/admin/charity-accounts/route.ts` (GET, POST)
- [ ] **[GAP-I]** Tạo `src/app/api/admin/charity-accounts/[id]/route.ts` (PATCH, DELETE)
- [ ] **[GAP-J]** Tạo `src/app/api/admin/config/route.ts` (GET, PATCH)
- [ ] **[GAP-M]** Tạo `src/app/api/mentee/stats/route.ts` (GET)
- [ ] **[GAP-N]** Tạo `src/app/api/mentor/stats/route.ts` (GET)
- [ ] **[GAP-O]** Tạo `src/app/api/reports/route.ts` (POST)
- [ ] **[GAP-O]** Tạo `src/app/api/admin/reports/route.ts` (GET)
- [ ] **[GAP-O]** Tạo `src/app/api/admin/reports/[id]/route.ts` (PATCH)

### 3.2 API Routes Sửa đổi

- [ ] **[GAP-C]** Sửa `src/app/api/sessions/route.ts` (POST) - thêm validations
- [ ] **[GAP-E]** Sửa `src/app/api/sessions/[id]/route.ts` (PATCH cancel) - late cancel logic
- [ ] **[GAP-G]** Sửa `src/app/api/payments/session-fee/route.ts` - fix TN account

### 3.3 UI Components Mới

- [ ] **[GAP-A]** Tạo `src/presentation/components/mentor/MentorApplicationForm.tsx`
  - [ ] Form: motivation, experience, linkedin, contact info
  - [ ] Hiển thị trạng thái application hiện tại
  - [ ] Submit handler

- [ ] **[GAP-A]** Tạo `src/presentation/components/admin/MentorApplicationsTable.tsx`
  - [ ] Table: applicant info, status, date
  - [ ] Approve/Reject actions với confirm dialogs

- [ ] **[GAP-B]** Tạo `src/presentation/components/mentor/MentorPublicProfile.tsx`
  - [ ] Header: avatar, name, headline, rating
  - [ ] Body: bio, expertise, fields, experience
  - [ ] Availability calendar
  - [ ] Stats: sessions, late cancel count
  - [ ] CTA: "Đặt lịch học" button

- [ ] **[GAP-I]** Tạo `src/presentation/components/admin/CharityAccountManager.tsx`
  - [ ] Table: name, accountNo, bank, status, usage count
  - [ ] Add form
  - [ ] Edit/Deactivate/Delete actions

- [ ] **[GAP-J]** Tạo `src/presentation/components/admin/SystemConfigPanel.tsx`
  - [ ] Key-value editor cho các config
  - [ ] Validation + Save

- [ ] **[GAP-O]** Tạo `src/presentation/components/review/ReportForm.tsx`
  - [ ] Reason dropdown, description textarea
  - [ ] Gộp vào review flow

### 3.4 UI Components Sửa đổi

- [ ] **[GAP-D]** Sửa `src/presentation/components/session/SessionCard.tsx`
  - [ ] Thêm dual confirmation UI (confirm buttons cho cả 2)
  - [ ] Hiển thị confirmation state
  - [ ] Mentor: input field cho Google Meet link khi confirm

- [ ] **[GAP-F]** Sửa `src/presentation/components/session/SessionCard.tsx`
  - [ ] Thêm "Đánh dấu vắng mặt" button cho mentor (sau giờ học)
  - [ ] Confirm dialog trước khi mark no-show

- [ ] **[GAP-L]** Sửa `src/presentation/components/session/SessionCard.tsx`
  - [ ] Mentor confirm: thêm input Google Meet link
  - [ ] Validate URL format

- [ ] **[GAP-P]** Sửa `src/presentation/components/settings/SettingsForm.tsx`
  - [ ] Hiển thị late cancellation count
  - [ ] Hiển thị no-show count (nếu là mentee)

### 3.5 Pages Mới

- [ ] **[GAP-A]** Tạo `src/app/(dashboard)/dashboard/mentee/apply-mentor/page.tsx`
- [ ] **[GAP-A]** Tạo `src/app/(dashboard)/dashboard/admin/mentor-applications/page.tsx`
- [ ] **[GAP-B]** Tạo `src/app/(dashboard)/dashboard/mentee/mentor/[id]/page.tsx`
- [ ] **[GAP-I]** Tạo `src/app/(dashboard)/dashboard/admin/charity-accounts/page.tsx`
- [ ] **[GAP-J]** Tạo `src/app/(dashboard)/dashboard/admin/config/page.tsx`
- [ ] **[GAP-O]** Tạo `src/app/(dashboard)/dashboard/admin/reports/page.tsx`

### 3.6 Pages Sửa đổi

- [ ] **[GAP-N]** Sửa `src/app/(dashboard)/dashboard/mentor/page.tsx` - real stats
- [ ] **[GAP-M]** Sửa `src/app/(dashboard)/dashboard/mentee/page.tsx` - real stats
- [ ] Sửa `src/presentation/components/layout/Sidebar.tsx`
  - [ ] Fix dead links (`/dashboard/admin/stats`, `/dashboard/mentee/impact`)
  - [ ] Thêm menu: "Hồ sơ Mentor" (apply), "Quản lý TK thiện nguyện", "Cấu hình", "Đơn đăng ký Mentor", "Báo cáo"

---

## Wave 4: Testing

### 4.1 Unit Tests

- [ ] Tạo `src/__tests__/unit/domain/value-objects/CancellationPolicy.test.ts`
- [ ] Tạo `src/__tests__/unit/domain/value-objects/BookingPolicy.test.ts`
- [ ] Tạo `src/__tests__/unit/application/MentorApplicationUseCases.test.ts`
- [ ] Tạo `src/__tests__/unit/application/MentorProfileUseCases.test.ts`
- [ ] Tạo `src/__tests__/unit/application/BookingValidations.test.ts`
- [ ] Tạo `src/__tests__/unit/application/CancellationRules.test.ts`
- [ ] Tạo `src/__tests__/unit/application/DualConfirmation.test.ts`
- [ ] Tạo `src/__tests__/unit/application/NoShowUseCases.test.ts`
- [ ] Tạo `src/__tests__/unit/application/CharityAccountUseCases.test.ts`
- [ ] Tạo `src/__tests__/unit/application/SystemConfigUseCases.test.ts`
- [ ] Tạo `src/__tests__/unit/application/StatsUseCases.test.ts`
- [ ] Tạo `src/__tests__/unit/application/ReportUseCases.test.ts`
- [ ] Tạo `src/__tests__/unit/application/PaymentFix.test.ts`

### 4.2 Integration Tests

- [ ] Tạo `src/__tests__/integration/repositories/PrismaMentorApplicationRepo.test.ts`
- [ ] Tạo `src/__tests__/integration/repositories/PrismaCharityAccountRepo.test.ts`
- [ ] Tạo `src/__tests__/integration/repositories/PrismaSystemConfigRepo.test.ts`
- [ ] Tạo `src/__tests__/integration/repositories/PrismaReportRepo.test.ts`
- [ ] Sửa `src/__tests__/integration/repositories/PrismaPaymentSessionRepo.test.ts` (thêm methods mới)

### 4.3 API Tests

- [ ] Tạo `src/__tests__/integration/api/MentorApplicationApi.test.ts`
- [ ] Tạo `src/__tests__/integration/api/CharityAccountApi.test.ts`
- [ ] Tạo `src/__tests__/integration/api/SystemConfigApi.test.ts`
- [ ] Sửa `src/__tests__/integration/api/ApiRoutes.test.ts` (thêm booking validation tests)

### 4.4 E2E Tests

- [ ] Tạo `src/__tests__/e2e/MentorApplicationJourney.test.ts`
- [ ] Tạo `src/__tests__/e2e/BookingWithValidations.test.ts`
- [ ] Tạo `src/__tests__/e2e/CancellationJourney.test.ts`
- [ ] Tạo `src/__tests__/e2e/DualConfirmJourney.test.ts`

### 4.5 Regression

- [ ] Chạy `npm test` - đảm bảo tất cả 247 tests cũ vẫn pass
- [ ] Chạy `npm run build` - đảm bảo build thành công
- [ ] Chạy `npm run lint` - đảm bảo không có linting errors

---

## Wave 5: Polish & Cleanup

### 5.1 Technical Debt

- [ ] Xóa/cleanup mock data trong mentor dashboard
- [ ] Xóa/cleanup mock data trong mentee dashboard
- [ ] Fix admin stats "change" text (compute real values hoặc bỏ)
- [ ] Wire mobile sidebar toggle trong TopBar
- [ ] Fix dead nav links trong Sidebar
- [ ] Bỏ unused GoogleMeetService stub (hoặc giữ deprecated)

### 5.2 Documentation

- [ ] Cập nhật `README.md` với features mới
- [ ] Cập nhật `src/__tests__/README.md` với test cases mới
- [ ] Thêm API documentation (có thể dùng Swagger/OpenAPI sau)

---

## Summary

| Wave | Số tasks | Estimated |
|------|---------|-----------|
| Wave 1: Foundation | 32 tasks | 3-4 ngày |
| Wave 2: Core Business | 35 tasks | 5-7 ngày |
| Wave 3: Presentation | 32 tasks | 5-7 ngày |
| Wave 4: Testing | 20 tasks | 3-4 ngày |
| Wave 5: Polish | 8 tasks | 1-2 ngày |
| **Tổng** | **127 tasks** | **17-24 ngày** |

---

## Tham chiếu

- Gap Analysis: `docs/gap-analysis.md`
- Development Plan: `docs/development-plan.md`
- Schema Changes: `docs/schema-changes.md`
- API Plan: `docs/api-plan.md`
- Feature List: (provided by Founder)
- Business Rules: (provided by Founder)
- Open Questions: (provided by Founder)