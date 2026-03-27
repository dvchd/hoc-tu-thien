# HocTuThien - Gap Analysis

**Project:** HocTuThien
**Date:** 27/03/2026
**Version:** v0.1
**Based on:** Feature List v0.1, Business Rules v0.1, Open Questions v0.1, User Journey v0.2

---

## 1. Tong quan

Codebase hien tai da xay dung duoc khoang **40% MVP** voi nen tang kien truc vung chac:
- Clean Architecture 4 layer (Domain, Application, Infrastructure, Presentation)
- DDD voi Entity, Value Object, Domain Events
- Repository Pattern + Unit of Work
- Audit Logging + Optimistic Locking
- ~247 test cases (unit, integration, e2e)

Phan con lai (~60%) bao gom cac tinh nang nghiep vu cot loi chua duoc implement hoac chi la stub.

---

## 2. Tinh nang DA HOAN THANH

| STT | Feature ID | Feature | Trang thai | Files chinh |
|-----|-----------|---------|-----------|-------------|
| 1 | F1 | Login with Google | DONE | `src/auth.ts`, `src/app/(auth)/login/page.tsx` |
| 2 | F2 | Create Default Mentee Account | DONE | `UserUseCases.ts` - FindOrCreateUserUseCase |
| 3 | F3 | Account Activation | DONE | `PaymentUseCases.ts` - InitiateActivationUseCase, `ActivationQRPanel.tsx` |
| 4 | F4 | View Personal Information | DONE | `SettingsForm.tsx`, `/dashboard/settings/page.tsx` |
| 5 | F13 | Browse and Filter Sessions | PARTIAL | `FindMentorClient.tsx` - co search/filter nhung thieu filter thoi gian |
| 6 | F19 | Store Session History | DONE | `LearningSession` model, `SessionCard.tsx` |
| 7 | F20 | Generate Transfer Code and VietQR | DONE | `Payment.ts` - generateShortCode(), buildVietQRUrl() |
| 8 | F22 | Auto Payment Verification | DONE | `ThienNguyenAppClient.ts`, `VerifyPaymentUseCase` |
| 9 | F26 | Admin Manage Teaching Fields | DONE | `TeachingFieldsManager.tsx`, admin/fields API |
| 10 | - | Leaderboard | DONE | `GetLeaderboardUseCase`, `/dashboard/leaderboard/page.tsx` |
| 11 | - | User CRUD + Role Management | DONE | `AdminUserTable.tsx`, user use cases |
| 12 | - | Audit Logging | DONE | `UserAuditLog` model, logged in all use cases |
| 13 | - | Route Protection (Middleware) | DONE | `src/middleware.ts` - role-based access |

---

## 3. Tinh nang CON THIEU hoac CHUA HOAN CHINH

### 3.1 P1 - Critical (Bat buoc cho MVP)

#### GAP-A: Mentor Application + Approval (F7, F8, F9)
**Business Rules lien quan:** BR02, BR07
**Hien trang:**
- `ApplyForMentorUseCase` la STUB - khong tao `MentorApplication` record, tra ve mock ID
- `MentorApplication` model da co trong schema nhung khong duoc su dung
- `MentorApplicationStatus` enum da dinh nghia (PENDING, APPROVED, REJECTED)
- Khong co admin UI de review applications

**Can lam:**
- [ ] Domain: `IMentorApplicationRepository` interface
- [ ] Infrastructure: `PrismaMentorApplicationRepository`
- [ ] Application: `SubmitMentorApplicationUseCase` (tao record that)
- [ ] Application: `ListMentorApplicationsUseCase` (admin list)
- [ ] Application: `ApproveMentorApplicationUseCase` (approve + tao MentorProfile + doi role)
- [ ] Application: `RejectMentorApplicationUseCase` (reject + ghi note)
- [ ] API: `POST /api/mentor/apply` (sua lai), `GET /api/admin/mentor-applications`, `PATCH /api/admin/mentor-applications/[id]`
- [ ] UI: Form dang ky mentor (mentee), Admin review panel
- [ ] Kiem tra trung lap application (user da co pending/approved)
- [ ] Khi approve: tu dong tao MentorProfile va chuyen role sang MENTOR

---

#### GAP-B: Mentor Profile Management (F10, F11, F12)
**Business Rules lien quan:** BR07, BR08, BR30
**Hien trang:**
- `MentorProfileForm` va `AvailabilityManager` UI da co
- API routes `/api/mentor/profile` va `/api/mentor/availability` da co
- NHUNG: khong co use case layer - API goi truc tiep Prisma
- Mentor co the chon bat ky TN account nao (vi pham BR08)

**Can lam:**
- [ ] Application: `CreateMentorProfileUseCase` (auto-create khi approved)
- [ ] Application: `UpdateMentorProfileUseCase` (validate + audit)
- [ ] Application: `GetMentorPublicProfileUseCase` (mentee xem)
- [ ] Application: `SetTeachingConfigurationUseCase` (chon mon, TN account, muc phi)
- [ ] Validation: mentor chi chon TN account tu danh sach admin (BR08)
- [ ] Logic: doi subject can admin re-review (BR30, OQ06)
- [ ] API: them public mentor profile endpoint
- [ ] UI: Mentor public profile page cho mentee xem

---

#### GAP-C: Booking Validations (F16)
**Business Rules lien quan:** BR03, BR04, BR05, BR09, BR10, BR11
**Hien trang:**
- `BookSessionUseCase` chi check: user active, no outstanding PAYMENT_PENDING
- Thieu nhieu validation quan trong

**Can lam:**
- [ ] Check activation cho paid session (BR03): mentee chua kich hoat chi dat 0 dong
- [ ] Cho phep unactivated mentee dat buoi hoc free (BR04)
- [ ] Gioi han 1 active booking tai 1 thoi diem (BR05)
- [ ] Minimum advance booking time = 1h truoc gio hoc (BR10)
- [ ] Session duration = gio nguyen: 1h, 2h, 3h (BR11)
- [ ] Schedule conflict: mentor khong co 2 session cung gio
- [ ] Validate mentor availability slot (mentee chi dat trong khung gio mentor mo)
- [ ] Check mentor.isAvailable == true
- [ ] Check mentor chi nhan activated mentee (BR06, P2)

---

#### GAP-D: Session Completion - Dual Confirmation (BR31)
**Business Rules lien quan:** BR31
**Hien trang:**
- Chi mentor goi `CompleteSessionUseCase` -> session COMPLETED hoac PAYMENT_PENDING
- Mentee khong co quyen confirm
- Khong co dispute flow

**Can lam:**
- [ ] Schema: them `mentorConfirmed`, `menteeConfirmed` vao LearningSession
- [ ] Application: `ConfirmCompletionByMentorUseCase` (set mentorConfirmed = true)
- [ ] Application: `ConfirmCompletionByMenteeUseCase` (set menteeConfirmed = true)
- [ ] Logic: khi ca 2 confirmed -> chuyen COMPLETED hoac PAYMENT_PENDING
- [ ] Logic: dispute - neu 1 ben tu choi, admin can thiep
- [ ] API: sua `PATCH /api/sessions/[id]` them action "confirm_completion"
- [ ] UI: nut confirm cho ca mentor va mentee sau buoi hoc

---

#### GAP-E: Cancellation Rules (F17, BR34, BR35, BR36)
**Business Rules lien quan:** BR34, BR35, BR36
**Hien trang:**
- `CancelSessionUseCase` cho ca 2 huy, nhung khong co time-based rules
- `cancelledAt` duoc luu nhung khong dung de phan loai

**Can lam:**
- [ ] Schema: them `isLateCancellation` vao LearningSession
- [ ] Schema: them `lateCancellationCount` vao User (hoac MentorProfile + MenteeProfile)
- [ ] Logic: huy trong 30 phut truoc scheduledAt -> isLateCancellation = true (BR35)
- [ ] Logic: tang lateCancellationCount khi late cancel
- [ ] UI: hien thi so lan huy muon tren profile (BR36)
- [ ] UI: canh bao khi user huy sat gio

---

#### GAP-F: No-show Handling (BR37, BR38)
**Business Rules lien quan:** BR37, BR38
**Hien trang:** Hoan toan chua co

**Can lam:**
- [ ] Value Object: them `NO_SHOW` vao SessionStatus enum
- [ ] Application: `MarkNoShowUseCase` (mentor danh dau mentee no-show)
- [ ] Logic: no-show -> KHONG phat sinh payment obligation (BR38)
- [ ] Logic: theo OQ05.1 - van tao payment binh thuong de mentee phai thanh toan
  - **Luu y:** OQ05.1 final decision va BR38 co mau thuan. BR38 noi "no payment", OQ05.1 noi "van tao payment". Can lam ro voi Founder.
  - Huong xu ly: Theo OQ05.1 (Founder decision) - van phat sinh payment cho mentee
- [ ] Schema: them `isNoShow`, `noShowMarkedBy` vao LearningSession
- [ ] Schema: them `noShowCount` vao MenteeProfile
- [ ] Mentor no-show (OQ05.2): mentor co the huy buoi hoc de mentee khong bi khoa
- [ ] Mutual no-show (OQ05.3): van phat sinh payment cho mentee

---

#### GAP-G: Session Fee Payment dung sai TN Account
**Business Rules lien quan:** BR08, BR16
**Hien trang:**
- `InitiateSessionFeePaymentUseCase` (line 265-267) luon dung `DEFAULT_TN_ACTIVATION_ACCOUNT`
- Mentor co fields `tnAccountNo`, `tnAccountName` nhung khong duoc su dung

**Can fix:**
- [ ] Lay TN account tu MentorProfile (tnAccountNo, tnAccountName, tnCampaignKeyword)
- [ ] Fallback ve default account chi khi mentor chua cau hinh
- [ ] Sau khi co CharityAccount model: validate tnAccountNo thuoc danh sach admin approved

---

#### GAP-H: Payment 24h Deadline Enforcement (BR32)
**Business Rules lien quan:** BR32
**Hien trang:**
- `expiresAt` duoc set (24h) nhung chi check khi user goi verify
- Khong co background job

**Can lam:**
- [ ] Cron job / API route scheduled: check expired payments, mark FAILED
- [ ] Hoac: check expiry khi mentee truy cap dashboard / dat lich moi
- [ ] Logic: qua 24h -> mark FAILED -> mentee chua du dieu kien dat lich moi

---

#### GAP-I: Charity Account Management (BR19, BR20, BR21)
**Business Rules lien quan:** BR19, BR20, BR21, BR28
**Hien trang:** TN account hardcoded trong env vars

**Can lam:**
- [ ] Schema: model `CharityAccount`
- [ ] Domain: `ICharityAccountRepository` interface
- [ ] Infrastructure: `PrismaCharityAccountRepository`
- [ ] Application: `CreateCharityAccountUseCase`
- [ ] Application: `ListCharityAccountsUseCase`
- [ ] Application: `UpdateCharityAccountUseCase`
- [ ] Application: `DeactivateCharityAccountUseCase` (soft delete cho account da su dung - BR21)
- [ ] Application: `DeleteCharityAccountUseCase` (hard delete chi khi chua su dung - BR20)
- [ ] API: `GET/POST/PATCH/DELETE /api/admin/charity-accounts`
- [ ] UI: Admin charity account manager component
- [ ] Default activation account co the cau hinh (BR28)

---

#### GAP-J: Admin Core Configuration (F26 mo rong)
**Business Rules lien quan:** BR28
**Hien trang:** Activation amount = 10000 hardcoded, TN account trong env

**Can lam:**
- [ ] Schema: model `SystemConfig` (key-value store)
- [ ] Keys can thiet: `activation_amount`, `default_charity_account_id`, `min_booking_advance_hours`, `late_cancel_threshold_minutes`, `payment_expiry_hours`
- [ ] Application: `GetSystemConfigUseCase`, `UpdateSystemConfigUseCase`
- [ ] API: `GET/PATCH /api/admin/config`
- [ ] UI: Admin system config panel
- [ ] Thay the tat ca hardcoded constants bang configurable values

---

#### GAP-K: Teaching Slot Creation (F14)
**Hien trang:** AvailabilityManager quan ly weekly schedule (recurring), chua co don le

**Can lam:**
- [ ] Application: `CreateTeachingSlotUseCase` (buoi day don le)
- [ ] Logic: support lich lap theo ngay/tuan
- [ ] Mentor view: calendar UI de tao va quan ly slots
- [ ] Mentee view: hien thi slots kha dung khi booking

---

#### GAP-L: Google Meet Link - Mentor tu nhap (F18, BR39)
**Hien trang:** `GoogleMeetService` la STUB tao link random

**Can lam (da chot: mentor tu nhap):**
- [ ] Sua `ConfirmSessionUseCase`: nhan `meetLink` tu mentor input
- [ ] Sua `SessionCard.tsx`: them input field cho mentor nhap Google Meet link khi confirm
- [ ] Validation: URL phai la `https://meet.google.com/*`
- [ ] Xoa hoac deprecate `GoogleMeetService` stub
- [ ] Tu dong hien thi Meet link cho mentee sau khi mentor confirm

---

### 3.2 P2 - Important (Nen co cho MVP)

#### GAP-M: Mentee Learning Statistics (F5)
- [ ] Application: `GetMenteeLearningStatsUseCase`
- [ ] Query: tong sessions, tong gio hoc, tong donated, avg rating given
- [ ] API: `GET /api/mentee/stats`
- [ ] UI: thay the hardcoded stats tren mentee dashboard

#### GAP-N: Mentor Teaching Statistics (F6)
- [ ] Application: `GetMentorTeachingStatsUseCase`
- [ ] Query: tong sessions, tong mentees, tong donations nhan, tong gio day
- [ ] API: `GET /api/mentor/stats`
- [ ] UI: thay the hardcoded stats tren mentor dashboard

#### GAP-O: Review & Report Mentor (F25)
- [ ] Schema: model `Report`
- [ ] Application: `ReportMentorUseCase`
- [ ] Gop review + report trong 1 UI flow (BR25)
- [ ] Admin: xem va xu ly reports (BR27)

#### GAP-P: Late Cancellation Display on Profile (BR36)
- [ ] UI: hien thi so lan huy muon tren mentor/mentee profile
- [ ] Public profile: badge hoac counter

---

## 4. Thong ke Gaps

| Priority | So luong gaps | Estimated effort |
|----------|-------------|-----------------|
| P1 Critical | 12 gaps (A-L) | ~15-20 ngay dev |
| P2 Important | 4 gaps (M-P) | ~5-7 ngay dev |
| **Tong** | **16 gaps** | **~20-27 ngay dev** |

---

## 5. Luu y quan trong

### 5.1 Mau thuan can lam ro voi Founder
- **OQ05.1 vs BR38:** BR38 noi no-show khong phat sinh payment, nhung OQ05.1 Founder quyet dinh van tao payment. Can chot 1 huong duy nhat.

### 5.2 Risks
- **Google Meet stub:** Hien tai link la random, khong phai real meeting. Can chuyen sang mentor tu nhap.
- **Payment routing:** Session fee dang chuyen ve sai TN account (platform account thay vi mentor's charity account). Day la bug nghiem trong can fix som.
- **No background jobs:** Khong co cron job cho payment expiry, session auto-completion, etc. Can phuong an thay the (API-triggered checks).

### 5.3 Technical Debt
- Mentor dashboard va mentee dashboard dung hardcoded mock data
- Admin stats "change" text (+12 tuan nay) la hardcoded
- Mobile sidebar toggle chua wire logic
- Notification bell UI co nhung chua co logic
- Admin stats page (`/dashboard/admin/stats`) va mentee impact page (`/dashboard/mentee/impact`) chua co (dead links trong sidebar)
