# HocTuThien - API Endpoints Plan

**Project:** HocTuThien
**Date:** 27/03/2026
**Version:** v0.1

---

## 1. API Endpoints Hien Tai

### Auth
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| GET/POST | `/api/auth/[...nextauth]` | Public | DONE |

### Users
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| GET | `/api/users/profile` | Authenticated | DONE |
| PATCH | `/api/users/profile` | Authenticated | DONE |

### Admin
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| GET | `/api/admin/users/role` | Admin | DONE |
| PATCH | `/api/admin/users/[id]` | Admin | DONE |
| DELETE | `/api/admin/users/[id]` | Admin | DONE |
| GET | `/api/admin/fields` | Admin | DONE |
| POST | `/api/admin/fields` | Admin | DONE |
| PATCH | `/api/admin/fields/[id]` | Admin | DONE |
| DELETE | `/api/admin/fields/[id]` | Admin | DONE |

### Mentor
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| GET | `/api/mentor/profile` | Mentor | DONE |
| PUT | `/api/mentor/profile` | Mentor | DONE (can refactor qua use case) |
| GET | `/api/mentor/availability` | Mentor | DONE |
| POST | `/api/mentor/availability` | Mentor | DONE |
| POST | `/api/mentor/apply` | Mentee | DONE (STUB - can fix) |

### Sessions
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| GET | `/api/sessions` | Authenticated | DONE |
| POST | `/api/sessions` | Mentee | DONE (can them validations) |
| GET | `/api/sessions/[id]` | Authenticated | DONE |
| PATCH | `/api/sessions/[id]` | Authenticated | DONE (can refactor) |
| POST | `/api/sessions/[id]/payment` | Mentee | DONE |

### Payments
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| POST | `/api/payments/session-fee` | Mentee | DONE (bug: sai TN account) |
| POST | `/api/payments/verify` | Authenticated | DONE |

### Other
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| GET | `/api/leaderboard` | Authenticated | DONE |
| GET | `/api/teaching-fields` | Public | DONE |

---

## 2. API Endpoints MOI Can Them

### 2.1 Mentor Application (P1)

#### `POST /api/mentor/apply` (SUA LAI)
**Muc dich:** Mentee gui don dang ky lam mentor
**Actor:** Mentee (ACTIVE status)
**File:** `src/app/api/mentor/apply/route.ts` (sua lai)

**Request Body:**
```json
{
  "motivation": "string (required, min 50 chars)",
  "experience": "string (required, min 50 chars)",
  "linkedinUrl": "string (optional, URL format)",
  "contactZalo": "string (optional)",
  "contactFacebook": "string (optional)",
  "contactEmail": "string (optional)"
}
```

**Response 201:**
```json
{
  "success": true,
  "application": {
    "id": "cuid",
    "userId": "cuid",
    "motivation": "...",
    "experience": "...",
    "status": "PENDING",
    "createdAt": "2026-03-27T..."
  }
}
```

**Response 400:** Da co application pending/approved
**Response 403:** User chua ACTIVE

---

#### `GET /api/admin/mentor-applications`
**Muc dich:** Admin xem danh sach mentor applications
**Actor:** Admin
**File:** `src/app/api/admin/mentor-applications/route.ts`

**Query Params:**
- `status`: PENDING | APPROVED | REJECTED (optional)
- `page`: number (default 1)
- `pageSize`: number (default 20)

**Response 200:**
```json
{
  "applications": [
    {
      "id": "cuid",
      "user": {
        "id": "cuid",
        "name": "string",
        "email": "string",
        "image": "string"
      },
      "motivation": "...",
      "experience": "...",
      "linkedinUrl": "...",
      "status": "PENDING",
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNote": null,
      "createdAt": "2026-03-27T..."
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 20
}
```

---

#### `PATCH /api/admin/mentor-applications/[id]`
**Muc dich:** Admin approve hoac reject application
**Actor:** Admin
**File:** `src/app/api/admin/mentor-applications/[id]/route.ts`

**Request Body:**
```json
{
  "action": "approve" | "reject",
  "reviewNote": "string (required khi reject)"
}
```

**Response 200 (approve):**
```json
{
  "success": true,
  "application": {
    "id": "cuid",
    "status": "APPROVED",
    "reviewedBy": "admin_cuid",
    "reviewedAt": "2026-03-27T..."
  },
  "mentorProfile": {
    "id": "cuid",
    "userId": "user_cuid"
  }
}
```

**Side effects khi approve:**
1. Application status -> APPROVED
2. Tao MentorProfile cho user
3. User role -> MENTOR
4. Audit log

**Response 200 (reject):**
```json
{
  "success": true,
  "application": {
    "id": "cuid",
    "status": "REJECTED",
    "reviewNote": "..."
  }
}
```

---

### 2.2 Mentor Public Profile (P1)

#### `GET /api/mentor/[id]/public-profile`
**Muc dich:** Xem ho so cong khai cua mentor
**Actor:** Authenticated (bat ky role)
**File:** `src/app/api/mentor/[id]/public-profile/route.ts`

**Response 200:**
```json
{
  "user": {
    "id": "cuid",
    "name": "string",
    "image": "string",
    "lateCancellationCount": 0
  },
  "profile": {
    "headline": "string",
    "expertise": "string",
    "experience": 5,
    "hourlyRate": 50000,
    "isAvailable": true,
    "totalSessions": 48,
    "rating": 4.8,
    "ratingCount": 32,
    "onlyActivatedMentee": false,
    "charityAccount": {
      "name": "Quy Thien Nguyen",
      "accountNo": "2000"
    }
  },
  "teachingFields": [
    { "id": "cuid", "name": "Lap trinh", "icon": "💻" }
  ],
  "availabilitySlots": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "12:00" }
  ]
}
```

---

### 2.3 Session - Dual Confirmation (P1)

#### `POST /api/sessions/[id]/confirm-completion`
**Muc dich:** Mentor hoac mentee xac nhan buoi hoc hoan tat
**Actor:** Mentor hoac Mentee cua session do
**File:** `src/app/api/sessions/[id]/confirm-completion/route.ts`

**Request Body:**
```json
{
  "meetLink": "https://meet.google.com/xxx-yyyy-zzz"  // Chi khi mentor confirm lan dau
}
```
(Body co the rong neu mentee confirm hoac mentor da nhap link truoc do)

**Response 200:**
```json
{
  "success": true,
  "session": {
    "id": "cuid",
    "status": "CONFIRMED",        // hoac "COMPLETED" / "PAYMENT_PENDING"
    "mentorConfirmed": true,
    "menteeConfirmed": false,
    "meetLink": "https://meet.google.com/..."
  },
  "message": "Mentor da xac nhan. Cho mentee xac nhan."
}
```

**Logic:**
1. Check user la mentor hoac mentee cua session
2. if mentor -> set mentorConfirmed = true (+ meetLink neu co)
3. if mentee -> set menteeConfirmed = true
4. if (mentorConfirmed && menteeConfirmed):
   - fee > 0 -> status = PAYMENT_PENDING
   - fee = 0 -> status = COMPLETED
5. Return updated session

---

### 2.4 Session - No-show (P1)

#### `POST /api/sessions/[id]/no-show`
**Muc dich:** Mentor danh dau mentee vang mat
**Actor:** Mentor cua session
**File:** `src/app/api/sessions/[id]/no-show/route.ts`

**Request Body:**
```json
{
  "reason": "string (optional)"
}
```

**Response 200:**
```json
{
  "success": true,
  "session": {
    "id": "cuid",
    "status": "PAYMENT_PENDING",  // hoac "NO_SHOW" tuy theo fee
    "isNoShow": true,
    "noShowMarkedBy": "mentor_cuid"
  }
}
```

**Logic:**
1. Validate mentor owns session, status in [CONFIRMED, IN_PROGRESS]
2. Validate scheduledAt da qua (khong cho mark no-show truoc gio hoc)
3. Set isNoShow = true, noShowMarkedBy = mentorId
4. Theo OQ05.1: if fee > 0 -> status = PAYMENT_PENDING (van phat sinh payment)
5. if fee = 0 -> status = NO_SHOW (ghi nhan, khong payment)
6. Increment mentee noShowCount

---

### 2.5 Charity Account Management (P1)

#### `GET /api/admin/charity-accounts`
**Actor:** Admin
**File:** `src/app/api/admin/charity-accounts/route.ts`

**Query Params:**
- `isActive`: boolean (optional)
- `includeDeleted`: boolean (default false)

**Response 200:**
```json
{
  "accounts": [
    {
      "id": "cuid",
      "name": "Quy Thien Nguyen",
      "accountNo": "2000",
      "bankName": "MB Bank",
      "campaignKeyword": null,
      "isActive": true,
      "isDefault": true,
      "usageCount": 15,
      "createdAt": "..."
    }
  ]
}
```

---

#### `POST /api/admin/charity-accounts`
**Actor:** Admin
**File:** `src/app/api/admin/charity-accounts/route.ts`

**Request Body:**
```json
{
  "name": "string (required)",
  "accountNo": "string (required, 4 digits)",
  "bankName": "string (default: MB Bank)",
  "campaignKeyword": "string (optional)",
  "description": "string (optional)",
  "isDefault": false
}
```

**Response 201:**
```json
{
  "success": true,
  "account": { ... }
}
```

---

#### `PATCH /api/admin/charity-accounts/[id]`
**Actor:** Admin
**File:** `src/app/api/admin/charity-accounts/[id]/route.ts`

**Request Body:**
```json
{
  "name": "string (optional)",
  "bankName": "string (optional)",
  "campaignKeyword": "string (optional)",
  "isActive": "boolean (optional)",
  "isDefault": "boolean (optional)"
}
```

---

#### `DELETE /api/admin/charity-accounts/[id]`
**Actor:** Admin
**File:** `src/app/api/admin/charity-accounts/[id]/route.ts`

**Response 200:** Hard delete thanh cong (usageCount = 0)
**Response 400:** Khong the xoa - tai khoan dang duoc su dung. Suggest deactivate thay vi delete.

---

### 2.6 System Config (P1)

#### `GET /api/admin/config`
**Actor:** Admin
**File:** `src/app/api/admin/config/route.ts`

**Response 200:**
```json
{
  "configs": [
    { "key": "activation_amount", "value": "10000", "description": "So tien kich hoat (VND)" },
    { "key": "min_booking_advance_hours", "value": "1", "description": "..." },
    { "key": "late_cancel_threshold_minutes", "value": "30", "description": "..." },
    { "key": "payment_expiry_hours", "value": "24", "description": "..." },
    { "key": "max_active_bookings", "value": "1", "description": "..." }
  ]
}
```

---

#### `PATCH /api/admin/config`
**Actor:** Admin
**File:** `src/app/api/admin/config/route.ts`

**Request Body:**
```json
{
  "configs": [
    { "key": "activation_amount", "value": "15000" },
    { "key": "late_cancel_threshold_minutes", "value": "60" }
  ]
}
```

**Response 200:**
```json
{
  "success": true,
  "updated": 2
}
```

---

### 2.7 Statistics (P2)

#### `GET /api/mentee/stats`
**Actor:** Mentee
**File:** `src/app/api/mentee/stats/route.ts`

**Response 200:**
```json
{
  "totalSessions": 24,
  "totalHours": 48,
  "totalDonated": 4800000,
  "avgRatingGiven": 4.5,
  "noShowCount": 0,
  "lateCancellationCount": 1
}
```

---

#### `GET /api/mentor/stats`
**Actor:** Mentor
**File:** `src/app/api/mentor/stats/route.ts`

**Response 200:**
```json
{
  "totalSessions": 48,
  "totalMentees": 12,
  "totalDonations": 12400000,
  "totalHours": 96,
  "avgRating": 4.8,
  "ratingCount": 32,
  "lateCancellationCount": 0
}
```

---

### 2.8 Reports (P2)

#### `POST /api/reports`
**Actor:** Mentee
**File:** `src/app/api/reports/route.ts`

**Request Body:**
```json
{
  "reportedUserId": "cuid (required)",
  "sessionId": "cuid (optional)",
  "reason": "INAPPROPRIATE | MISCONDUCT | NO_SHOW_DISPUTE | OTHER",
  "description": "string (required, min 20 chars)"
}
```

---

#### `GET /api/admin/reports`
**Actor:** Admin
**File:** `src/app/api/admin/reports/route.ts`

**Query Params:** `status`, `page`, `pageSize`

---

#### `PATCH /api/admin/reports/[id]`
**Actor:** Admin
**File:** `src/app/api/admin/reports/[id]/route.ts`

**Request Body:**
```json
{
  "status": "REVIEWED | RESOLVED | DISMISSED",
  "reviewNote": "string (required)"
}
```

---

## 3. API Endpoints CAN SUA DOI

### 3.1 `POST /api/sessions` - Them Validations

**Them checks:**
```
1. if (fee > 0 && user.status !== "ACTIVE") -> 403 "Can kich hoat tai khoan"
2. if (activeBookingCount >= maxActiveBookings) -> 400 "Da co booking dang hoat dong"
3. if (scheduledAt - now < minAdvanceHours * 3600000) -> 400 "Dat truoc it nhat X gio"
4. if (durationMinutes % 60 !== 0) -> 400 "Thoi luong phai la gio nguyen"
5. if (conflictingSession) -> 400 "Mentor da co buoi hoc vao thoi gian nay"
6. if (mentor.onlyActivatedMentee && user.status !== "ACTIVE") -> 403
```

### 3.2 `PATCH /api/sessions/[id]` - Sua Cancel Logic

**Khi action = "cancel":**
```
1. Calculate minutesBeforeStart
2. if (minutesBeforeStart <= lateThreshold) -> mark isLateCancellation
3. Increment user lateCancellationCount
```

### 3.3 `POST /api/payments/session-fee` - Fix TN Account

**Sua:**
```
// Lay TN account tu MentorProfile thay vi default
// Uu tien: charityAccount -> tnAccountNo -> default
```

### 3.4 `PUT /api/mentor/profile` - Refactor qua Use Case

**Hien tai:** API goi truc tiep Prisma
**Sau:** API goi `UpdateMentorProfileUseCase` (co validation + audit)

---

## 4. Authentication & Authorization Summary

| Role | Endpoints Access |
|------|-----------------|
| **Public** | `/api/auth/*`, `/api/teaching-fields` |
| **Authenticated** | `/api/users/profile`, `/api/sessions` (GET), `/api/leaderboard`, `/api/mentor/[id]/public-profile` |
| **Mentee** | `/api/sessions` (POST), `/api/mentor/apply`, `/api/mentee/stats`, `/api/reports` (POST), `/api/sessions/[id]/confirm-completion` |
| **Mentor** | `/api/mentor/profile`, `/api/mentor/availability`, `/api/mentor/stats`, `/api/sessions/[id]/confirm-completion`, `/api/sessions/[id]/no-show` |
| **Admin** | `/api/admin/*` (users, fields, mentor-applications, charity-accounts, config, reports) |

---

## 5. Error Response Format (Chuan hoa)

Tat ca API errors tra ve format thong nhat:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mo ta loi bang tieng Viet",
    "details": {}
  }
}
```

**Error codes chuan:**
| Code | HTTP Status | Mo ta |
|------|------------|-------|
| `UNAUTHORIZED` | 401 | Chua dang nhap |
| `FORBIDDEN` | 403 | Khong co quyen |
| `NOT_FOUND` | 404 | Resource khong ton tai |
| `VALIDATION_ERROR` | 400 | Du lieu khong hop le |
| `CONFLICT` | 409 | Trung lap (vd: da co application) |
| `BUSINESS_RULE_VIOLATION` | 422 | Vi pham business rule |
| `INTERNAL_ERROR` | 500 | Loi he thong |
