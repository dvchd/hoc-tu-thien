# HocTuThien - Gap Analysis

**Project:** HocTuThien
**Date:** 27/03/2026
**Version:** v0.1
**Based on:** Feature List v0.1, Business Rules v0.1, Open Questions v0.1, User Journey v0.2

---

## 1. Tổng quan

Codebase hiện tại đã xây dựng được khoảng **40% MVP** với nền tảng kiến trúc vững chắc:
- Clean Architecture 4 layer (Domain, Application, Infrastructure, Presentation)
- DDD với Entity, Value Object, Domain Events
- Repository Pattern + Unit of Work
- Audit Logging + Optimistic Locking
- ~247 test cases (unit, integration, e2e)

Phần còn lại (~60%) bao gồm các tính năng nghiệp vụ cốt lõi chưa được implement hoặc chỉ là stub.

---

## 2. Tính năng ĐÃ HOÀN THÀNH

| STT | Feature ID | Feature | Trạng thái | Files chính |
|-----|-----------|---------|-----------|-------------|
| 1 | F1 | Login with Google | DONE | `src/auth.ts`, `src/app/(auth)/login/page.tsx` |
| 2 | F2 | Create Default Mentee Account | DONE | `UserUseCases.ts` - FindOrCreateUserUseCase |
| 3 | F3 | Account Activation | DONE | `PaymentUseCases.ts` - InitiateActivationUseCase, `ActivationQRPanel.tsx` |
| 4 | F4 | View Personal Information | DONE | `SettingsForm.tsx`, `/dashboard/settings/page.tsx` |
| 5 | F13 | Browse and Filter Sessions | PARTIAL | `FindMentorClient.tsx` - có search/filter nhưng thiếu filter thời gian |
| 6 | F19 | Store Session History | DONE | `LearningSession` model, `SessionCard.tsx` |
| 7 | F20 | Generate Transfer Code and VietQR | DONE | `Payment.ts` - generateShortCode(), buildVietQRUrl() |
| 8 | F22 | Auto Payment Verification | DONE | `ThienNguyenAppClient.ts`, `VerifyPaymentUseCase` |
| 9 | F26 | Admin Manage Teaching Fields | DONE | `TeachingFieldsManager.tsx`, admin/fields API |
| 10 | - | Leaderboard | DONE | `GetLeaderboardUseCase`, `/dashboard/leaderboard/page.tsx` |
| 11 | - | User CRUD + Role Management | DONE | `AdminUserTable.tsx`, user use cases |
| 12 | - | Audit Logging | DONE | `UserAuditLog` model, logged in all use cases |
| 13 | - | Route Protection (Middleware) | DONE | `src/middleware.ts` - role-based access |

---

## 3. Tính năng CÒN THIẾU hoặc CHƯA HOÀN CHỈNH

### 3.1 P1 - Critical (Bắt buộc cho MVP)

#### GAP-A: Mentor Application + Approval (F7, F8, F9)
**Business Rules liên quan:** BR02, BR07
**Hiện trạng:**
- `ApplyForMentorUseCase` là STUB - không tạo `MentorApplication` record, trả về mock ID
- `MentorApplication` model đã có trong schema nhưng không được sử dụng
- `MentorApplicationStatus` enum đã định nghĩa (PENDING, APPROVED, REJECTED)
- Không có admin UI để review applications

**Cần làm:**
- [ ] Domain: `IMentorApplicationRepository` interface
- [ ] Infrastructure: `PrismaMentorApplicationRepository`
- [ ] Application: `SubmitMentorApplicationUseCase` (tạo record thật)
- [ ] Application: `ListMentorApplicationsUseCase` (admin list)
- [ ] Application: `ApproveMentorApplicationUseCase` (approve + tạo MentorProfile + đổi role)
- [ ] Application: `RejectMentorApplicationUseCase` (reject + ghi note)
- [ ] API: `POST /api/mentor/apply` (sửa lại), `GET /api/admin/mentor-applications`, `PATCH /api/admin/mentor-applications/[id]`
- [ ] UI: Form đăng ký mentor (mentee), Admin review panel
- [ ] Kiểm tra trùng lặp application (user đã có pending/approved)
- [ ] Khi approve: tự động tạo MentorProfile và chuyển role sang MENTOR

---

#### GAP-B: Mentor Profile Management (F10, F11, F12)
**Business Rules liên quan:** BR07, BR08, BR30
**Hiện trạng:**
- `MentorProfileForm` và `AvailabilityManager` UI đã có
- API routes `/api/mentor/profile` và `/api/mentor/availability` đã có
- NHƯNG: không có use case layer - API gọi trực tiếp Prisma
- Mentor có thể chọn bất kỳ TN account nào (vi phạm BR08)

**Cần làm:**
- [ ] Application: `CreateMentorProfileUseCase` (auto-create khi approved)
- [ ] Application: `UpdateMentorProfileUseCase` (validate + audit)
- [ ] Application: `GetMentorPublicProfileUseCase` (mentee xem)
- [ ] Application: `SetTeachingConfigurationUseCase` (chọn môn, TN account, mức phí)
- [ ] Validation: mentor chỉ chọn TN account từ danh sách admin (BR08)
- [ ] Logic: đổi subject cần admin re-review (BR30, OQ06)
- [ ] API: thêm public mentor profile endpoint
- [ ] UI: Mentor public profile page cho mentee xem

---

#### GAP-C: Booking Validations (F16)
**Business Rules liên quan:** BR03, BR04, BR05, BR09, BR10, BR11
**Hiện trạng:**
- `BookSessionUseCase` chỉ check: user active, no outstanding PAYMENT_PENDING
- Thiếu nhiều validation quan trọng

**Cần làm:**
- [ ] Check activation cho paid session (BR03): mentee chưa kích hoạt chỉ đặt 0 đồng
- [ ] Cho phép unactivated mentee đặt buổi học free (BR04)
- [ ] Giới hạn 1 active booking tại 1 thời điểm (BR05)
- [ ] Minimum advance booking time = 1h trước giờ học (BR10)
- [ ] Session duration = giờ nguyên: 1h, 2h, 3h (BR11)
- [ ] Schedule conflict: mentor không có 2 session cùng giờ
- [ ] Validate mentor availability slot (mentee chỉ đặt trong khung giờ mentor mở)
- [ ] Check mentor.isAvailable == true
- [ ] Check mentor chỉ nhận activated mentee (BR06, P2)

---

#### GAP-D: Session Completion - Dual Confirmation (BR31)
**Business Rules liên quan:** BR31
**Hiện trạng:**
- Chỉ mentor gọi `CompleteSessionUseCase` -> session COMPLETED hoặc PAYMENT_PENDING
- Mentee không có quyền confirm
- Không có dispute flow

**Cần làm:**
- [ ] Schema: thêm `mentorConfirmed`, `menteeConfirmed` vào LearningSession
- [ ] Application: `ConfirmCompletionByMentorUseCase` (set mentorConfirmed = true)
- [ ] Application: `ConfirmCompletionByMenteeUseCase` (set menteeConfirmed = true)
- [ ] Logic: khi cả 2 confirmed -> chuyển COMPLETED hoặc PAYMENT_PENDING
- [ ] Logic: dispute - nếu 1 bên từ chối, admin can thiệp
- [ ] API: sửa `PATCH /api/sessions/[id]` thêm action "confirm_completion"
- [ ] UI: nút confirm cho cả mentor và mentee sau buổi học

---

#### GAP-E: Cancellation Rules (F17, BR34, BR35, BR36)
**Business Rules liên quan:** BR34, BR35, BR36
**Hiện trạng:**
- `CancelSessionUseCase` cho cả 2 hủy, nhưng không có time-based rules
- `cancelledAt` được lưu nhưng không dùng để phân loại

**Cần làm:**
- [ ] Schema: thêm `isLateCancellation` vào LearningSession
- [ ] Schema: thêm `lateCancellationCount` vào User (hoặc MentorProfile + MenteeProfile)
- [ ] Logic: hủy trong 30 phút trước scheduledAt -> isLateCancellation = true (BR35)
- [ ] Logic: tăng lateCancellationCount khi late cancel
- [ ] UI: hiển thị số lần hủy muộn trên profile (BR36)
- [ ] UI: cảnh báo khi user hủy sát giờ

---

#### GAP-F: No-show Handling (BR37, BR38)
**Business Rules liên quan:** BR37, BR38
**Hiện trạng:** Hoàn toàn chưa có

**Cần làm:**
- [ ] Value Object: thêm `NO_SHOW` vào SessionStatus enum
- [ ] Application: `MarkNoShowUseCase` (mentor đánh dấu mentee no-show)
- [ ] Logic: no-show -> KHÔNG phát sinh payment obligation (BR38)
- [ ] Logic: theo OQ05.1 - vẫn tạo payment bình thường để mentee phải thanh toán
  - **Quyết định đã thống nhất:** Theo OQ05.1 (quyết định của Founder) - no-show vẫn phát sinh payment bình thường để mentee phải thanh toán nhằm tăng tính cam kết. Business Rule 38 (BR38) sẽ được cập nhật lại theo hướng này.
  - Hướng xử lý: Khi mentor đánh dấu no-show, hệ thống tạo payment obligation cho mentee.
- [ ] Schema: thêm `isNoShow`, `noShowMarkedBy` vào LearningSession
- [ ] Schema: thêm `noShowCount` vào MenteeProfile
- [ ] Mentor no-show (OQ05.2): mentor có thể hủy buổi học để mentee không bị khóa
- [ ] Mutual no-show (OQ05.3): vẫn phát sinh payment cho mentee

---

#### GAP-G: Session Fee Payment dùng sai TN Account
**Business Rules liên quan:** BR08, BR16
**Hiện trạng:**
- `InitiateSessionFeePaymentUseCase` (line 265-267) luôn dùng `DEFAULT_TN_ACTIVATION_ACCOUNT`
- Mentor có fields `tnAccountNo`, `tnAccountName` nhưng không được sử dụng

**Cần fix:**
- [ ] Lấy TN account từ MentorProfile (tnAccountNo, tnAccountName, tnCampaignKeyword)
- [ ] Fallback về default account chỉ khi mentor chưa cấu hình
- [ ] Sau khi có CharityAccount model: validate tnAccountNo thuộc danh sách admin approved

---

#### GAP-H: Payment 24h Deadline Enforcement (BR32)
**Business Rules liên quan:** BR32
**Hiện trạng:**
- `expiresAt` được set (24h) nhưng chỉ check khi user gọi verify
- Không có background job

**Cần làm:**
- [ ] Cron job / API route scheduled: check expired payments, mark FAILED
- [ ] Hoặc: check expiry khi mentee truy cập dashboard / đặt lịch mới
- [ ] Logic: quá 24h -> mark FAILED -> mentee chưa đủ điều kiện đặt lịch mới

---

#### GAP-I: Charity Account Management (BR19, BR20, BR21)
**Business Rules liên quan:** BR19, BR20, BR21, BR28
**Hiện trạng:** TN account hardcoded trong env vars

**Cần làm:**
- [ ] Schema: model `CharityAccount`
- [ ] Domain: `ICharityAccountRepository` interface
- [ ] Infrastructure: `PrismaCharityAccountRepository`
- [ ] Application: `CreateCharityAccountUseCase`
- [ ] Application: `ListCharityAccountsUseCase`
- [ ] Application: `UpdateCharityAccountUseCase`
- [ ] Application: `DeactivateCharityAccountUseCase` (soft delete cho account đã sử dụng - BR21)
- [ ] Application: `DeleteCharityAccountUseCase` (hard delete chỉ khi chưa sử dụng - BR20)
- [ ] API: `GET/POST/PATCH/DELETE /api/admin/charity-accounts`
- [ ] UI: Admin charity account manager component
- [ ] Default activation account có thể cấu hình (BR28)

---

#### GAP-J: Admin Core Configuration (F26 mở rộng)
**Business Rules liên quan:** BR28
**Hiện trạng:** Activation amount = 10000 hardcoded, TN account trong env

**Cần làm:**
- [ ] Schema: model `SystemConfig` (key-value store)
- [ ] Keys cần thiết: `activation_amount`, `default_charity_account_id`, `min_booking_advance_hours`, `late_cancel_threshold_minutes`, `payment_expiry_hours`
- [ ] Application: `GetSystemConfigUseCase`, `UpdateSystemConfigUseCase`
- [ ] API: `GET/PATCH /api/admin/config`
- [ ] UI: Admin system config panel
- [ ] Thay thế tất cả hardcoded constants bằng configurable values

---

#### GAP-K: Teaching Slot Creation (F14)
**Hiện trạng:** AvailabilityManager quản lý weekly schedule (recurring), chưa có đơn lẻ

**Cần làm:**
- [ ] Application: `CreateTeachingSlotUseCase` (buổi dạy đơn lẻ)
- [ ] Logic: support lịch lặp theo ngày/tuần
- [ ] Mentor view: calendar UI để tạo và quản lý slots
- [ ] Mentee view: hiển thị slots khả dụng khi booking

---

#### GAP-L: Google Meet Link - Mentor tự nhập (F18, BR39)
**Hiện trạng:** `GoogleMeetService` là STUB tạo link random

**Cần làm (đã chốt: mentor tự nhập):**
- [ ] Sửa `ConfirmSessionUseCase`: nhận `meetLink` từ mentor input
- [ ] Sửa `SessionCard.tsx`: thêm input field cho mentor nhập Google Meet link khi confirm
- [ ] Validation: URL phải là `https://meet.google.com/*`
- [ ] Xóa hoặc deprecate `GoogleMeetService` stub
- [ ] Tự động hiển thị Meet link cho mentee sau khi mentor confirm

---

### 3.2 P2 - Important (Nên có cho MVP)

#### GAP-M: Mentee Learning Statistics (F5)
- [ ] Application: `GetMenteeLearningStatsUseCase`
- [ ] Query: tổng sessions, tổng giờ học, tổng donated, avg rating given
- [ ] API: `GET /api/mentee/stats`
- [ ] UI: thay thế hardcoded stats trên mentee dashboard

#### GAP-N: Mentor Teaching Statistics (F6)
- [ ] Application: `GetMentorTeachingStatsUseCase`
- [ ] Query: tổng sessions, tổng mentees, tổng donations nhận, tổng giờ dạy
- [ ] API: `GET /api/mentor/stats`
- [ ] UI: thay thế hardcoded stats trên mentor dashboard

#### GAP-O: Review & Report Mentor (F25)
- [ ] Schema: model `Report`
- [ ] Application: `ReportMentorUseCase`
- [ ] Gộp review + report trong 1 UI flow (BR25)
- [ ] Admin: xem và xử lý reports (BR27)

#### GAP-P: Late Cancellation Display on Profile (BR36)
- [ ] UI: hiển thị số lần hủy muộn trên mentor/mentee profile
- [ ] Public profile: badge hoặc counter

---

## 4. Thống kê Gaps

| Priority | Số lượng gaps | Estimated effort |
|----------|-------------|-----------------|
| P1 Critical | 12 gaps (A-L) | ~15-20 ngày dev |
| P2 Important | 4 gaps (M-P) | ~5-7 ngày dev |
| **Tổng** | **16 gaps** | **~20-27 ngày dev** |

---

## 5. Lưu ý quan trọng

### 5.1 Quyết định đã thống nhất (Update)
- **OQ05.1 vs BR38 (No-show payment):** Đã thống nhất theo quyết định của Founder (OQ05.1): No-show vẫn phát sinh payment obligation bình thường để mentee phải thanh toán nhằm tăng tính cam kết. Codebase và các logic liên quan sẽ được triển khai theo hướng này.

### 5.2 Risks
- **Google Meet stub:** Hiện tại link là random, không phải real meeting. Cần chuyển sang mentor tự nhập.
- **Payment routing:** Session fee đang chuyển về sai TN account (platform account thay vì mentor's charity account). Đây là bug nghiêm trọng cần fix sớm.
- **No background jobs:** Không có cron job cho payment expiry, session auto-completion, etc. Cần phương án thay thế (API-triggered checks).

### 5.3 Technical Debt
- Mentor dashboard và mentee dashboard dùng hardcoded mock data
- Admin stats "change" text (+12 tuần này) là hardcoded
- Mobile sidebar toggle chưa wire logic
- Notification bell UI có nhưng chưa có logic
- Admin stats page (`/dashboard/admin/stats`) và mentee impact page (`/dashboard/mentee/impact`) chưa có (dead links trong sidebar)
