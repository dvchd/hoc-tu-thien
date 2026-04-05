# HocTuThien - Gap Analysis

**Project:** HocTuThien
**Date:** 27/03/2026 (cập nhật: 29/03/2026)
**Version:** v0.2
**Based on:** Feature List v0.1, Business Rules v0.1, Open Questions v0.1, User Journey v0.2

---

## 1. Tổng quan

Codebase hiện tại đã xây dựng được khoảng **85% MVP** với nền tảng kiến trúc vững chắc:
- Clean Architecture 4 layer (Domain, Application, Infrastructure, Presentation)
- DDD với Entity, Value Object, Domain Events
- Repository Pattern + Unit of Work
- Audit Logging + Optimistic Locking
- **547 test cases** (unit + e2e) – tăng từ 247 test

Phần còn lại (~15%) bao gồm background jobs, một số UI polish và tính năng phụ.

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
| 14 | F7-9 | Mentor Application + Approval | DONE | `MentorApplicationUseCases.ts`, admin/applications API, `MentorApplicationForm.tsx` |
| 15 | F10-12 | Mentor Profile Management | DONE | `MentorProfileUseCases.ts`, `MentorProfileForm.tsx`, `AvailabilityManager.tsx` |
| 16 | F15-16 | Mentor Public Profile + Booking | DONE | `MentorPublicProfile.tsx` (fixed 29/03), `/mentor/[id]/public-profile` API |
| 17 | F16 | Booking Validations (BR03-11) | DONE | `BookingPolicy.ts`, `BookSessionUseCase` (all validations) |
| 18 | F17 | Cancellation Rules (BR34-36) | DONE | `CancellationPolicy.ts`, `CancelSessionUseCase` |
| 19 | F18 | Dual Confirmation (BR31) | DONE | `ConfirmCompletionUseCase`, `/sessions/[id]/confirm-completion` |
| 20 | F18 | No-show Handling (BR37) | DONE | `MarkNoShowUseCase`, `/sessions/[id]/no-show` |
| 21 | F5 | Mentee Learning Stats | DONE | `GetMenteeLearningStatsUseCase`, `/api/mentee/stats` |
| 22 | F6 | Mentor Teaching Stats | DONE | `GetMentorTeachingStatsUseCase`, `/api/mentor/stats` |
| 23 | F25 | Review & Report | DONE | `ReportUseCases.ts`, `/api/reports`, `/api/admin/reports` |
| 24 | BR19-21 | Charity Account Management | DONE | `CharityAccountUseCases.ts`, admin/charity-accounts API |
| 25 | BR28 | System Configuration | DONE | `SystemConfigUseCases.ts`, `SystemConfig` model, admin/config API |

---

## 3. Tính năng CÒN THIẾU hoặc CHƯA HOÀN CHỈNH

### 3.1 P1 - Critical (Bắt buộc cho MVP)

#### GAP-G: Session Fee Payment dùng sai TN Account *(đã fix)*
**Business Rules liên quan:** BR08, BR16
**Hiện trạng:**
- `CharityAccount` model đã có, mentor có thể chọn charity account (BR08 ✅)
- Session fee payment đã lấy account từ `MentorProfile.charityAccount` ✅
- Fallback chain đã được xác nhận: `charityAccount` → `tnAccountNo` → `default account` ✅

**Đã làm:**
- [x] Xác nhận lại fallback chain: `charityAccount` → `tnAccountNo` → default account

---

#### GAP-H: Payment 24h Deadline Enforcement (BR32)
**Business Rules liên quan:** BR32
**Hiện trạng:**
- `expiresAt` được set (24h) và check khi user gọi verify ✅
- Session giữ PAYMENT_PENDING khi payment hết hạn → BR09 block mentee đặt lịch mới ✅ (đúng theo BR32)
- Mentee vẫn có thể re-initiate payment cho cùng session ✅

**Thiết kế hiện tại đã đúng theo BR32:**
> "Quá thời hạn mà chưa hoàn tất donation thì mentee chưa đủ điều kiện đặt lịch mới."
> Giữ PAYMENT_PENDING là cơ chế "jailed to complete" — mentee phải hoàn thành nghĩa vụ thanh toán trước khi tiếp tục.

**Cần làm:**
- [ ] Cron job / API route scheduled: check expired payments proactively (optional — hiện tại check on-demand khi user verify)

---

#### GAP-K: Teaching Slot Creation đơn lẻ (F14)
**Hiện trạng:** `AvailabilityManager` quản lý weekly recurring schedule ✅, chưa có buổi đơn lẻ

**Cần làm:**
- [ ] Application: `CreateTeachingSlotUseCase` (buổi dạy đơn lẻ, ngoài lịch recurring)
- [ ] Mentor view: calendar UI cho slot đơn lẻ

---

### 3.2 P2 - Important

#### GAP-P: Late Cancellation Display on Profile (BR36)
- [ ] UI: hiển thị số lần hủy muộn (`lateCancellationCount`) trên public profile mentor
- [ ] UI: hiển thị `noShowCount` trên profile mentee (trong settings)

---

### 3.3 P3 - Nice to Have / Technical Debt

- [ ] **Admin stats "change" text** (`+12 tuần này`): hardcoded, cần tính real values
- [ ] **Mobile sidebar toggle**: chưa wire logic trong TopBar
- [ ] **Notification bell**: UI có nhưng chưa có logic
- [ ] **Admin stats page** (`/dashboard/admin/stats`): đã có page, cần cải thiện nội dung

---

## 4. Thống kê Gaps (cập nhật 29/03/2026)

| Priority | Số lượng gaps còn lại | Trạng thái |
|----------|----------------------|-----------|
| P1 Critical | 2 gaps (H, K) | H: chỉ còn optional background job; K: Teaching slot đơn lẻ |
| P2 Important | 1 gap (P) | UI display only |
| P3 Tech Debt | 4 items | Nice to have |
| **Tổng** | **~6 items** | **~2-3 ngày dev** |

**So với phiên bản trước (v0.1):** Từ 16 gaps → còn 6 items nhỏ. GAP-G đã được fix (30/03/2026). GAP-H xác nhận thiết kế hiện tại đã đúng theo BR32.

---

## 5. Lưu ý quan trọng

### 5.1 Quyết định đã thống nhất (Update)
- **OQ05.1 vs BR38 (No-show payment):** Đã thống nhất theo quyết định của Founder (OQ05.1): No-show vẫn phát sinh payment obligation bình thường để mentee phải thanh toán nhằm tăng tính cam kết. Codebase và các logic liên quan sẽ được triển khai theo hướng này.

### 5.2 Risks
- **Google Meet stub:** Hiện tại link là random, không phải real meeting. Cần chuyển sang mentor tự nhập.
- **Payment routing:** Session fee đang chuyển về sai TN account (platform account thay vì mentor's charity account). Đây là bug nghiêm trọng cần fix sớm.
- **No background jobs:** Không có cron job cho payment expiry, session auto-completion, etc. Cần phương án thay thế (API-triggered checks).

### 5.2 Bugs đã sửa (29/03/2026)

- **MentorPublicProfile component** (`src/presentation/components/mentor/MentorPublicProfile.tsx`): Component cũ truy cập sai cấu trúc dữ liệu từ `GetMentorPublicProfileUseCase` (dùng `mentor.averageRating`, `mentor.charityAccount`, `mentor.teachingFields[].field.name` nhưng use case trả về `mentor.profile.rating`, `mentor.profile.charityAccount`, `mentor.teachingFields[].name`). Đã sửa để dùng đúng cấu trúc `MentorPublicProfileResult` và bổ sung booking modal tích hợp.

### 5.3 Technical Debt
- Admin stats "change" text (+12 tuần này) là hardcoded
- Mobile sidebar toggle chưa wire logic
- Notification bell UI có nhưng chưa có logic
