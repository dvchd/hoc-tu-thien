# HocTuThien - Kế hoạch API Endpoints

**Dự án:** Học Từ Thiện (HocTuThien)
**Ngày:** 27/03/2026
**Phiên bản:** v0.1

---

## 1. API Endpoints Hiện Tại

### Xác thực (Auth)
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| GET/POST | `/api/auth/[...nextauth]` | Public | DONE |

### Người dùng (Users)
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| GET | `/api/users/profile` | Authenticated | DONE |
| PATCH | `/api/users/profile` | Authenticated | DONE |

### Quản trị viên (Admin)
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| GET | `/api/admin/users/role` | Admin | DONE |
| PATCH | `/api/admin/users/[id]` | Admin | DONE |
| DELETE | `/api/admin/users/[id]` | Admin | DONE |
| GET | `/api/admin/fields` | Admin | DONE |
| POST | `/api/admin/fields` | Admin | DONE |
| PATCH | `/api/admin/fields/[id]` | Admin | DONE |
| DELETE | `/api/admin/fields/[id]` | Admin | DONE |

### Người hướng dẫn (Mentor)
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| GET | `/api/mentor/profile` | Mentor | DONE |
| PUT | `/api/mentor/profile` | Mentor | DONE (cần refactor qua use case) |
| GET | `/api/mentor/availability` | Mentor | DONE |
| POST | `/api/mentor/availability` | Mentor | DONE |
| POST | `/api/mentor/apply` | Mentee | DONE (STUB - cần fix) |

### Buổi học (Sessions)
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| GET | `/api/sessions` | Authenticated | DONE |
| POST | `/api/sessions` | Mentee | DONE (cần thêm validations) |
| GET | `/api/sessions/[id]` | Authenticated | DONE |
| PATCH | `/api/sessions/[id]` | Authenticated | DONE (cần refactor) |
| POST | `/api/sessions/[id]/payment` | Mentee | DONE |

### Thanh toán (Payments)
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| POST | `/api/payments/session-fee` | Mentee | DONE (bug: sai tài khoản thiện nguyện) |
| POST | `/api/payments/verify` | Authenticated | DONE |

### Khác (Other)
| Method | Endpoint | Actor | Status |
|--------|----------|-------|--------|
| GET | `/api/leaderboard` | Authenticated | DONE |
| GET | `/api/teaching-fields` | Public | DONE |

---

## 2. API Endpoints MỚI Cần Thêm

### 2.1 Đăng ký Mentor (Mentor Application) (P1)

#### `POST /api/mentor/apply` (SỬA LẠI)
**Mục đích:** Mentee gửi đơn đăng ký làm mentor
**Actor:** Mentee (trạng thái ACTIVE)
**File:** `src/app/api/mentor/apply/route.ts` (sửa lại)

**Request Body:**
```json
{
  "motivation": "string (bắt buộc, tối thiểu 50 ký tự)",
  "experience": "string (bắt buộc, tối thiểu 50 ký tự)",
  "linkedinUrl": "string (tùy chọn, định dạng URL)",
  "contactZalo": "string (tùy chọn)",
  "contactFacebook": "string (tùy chọn)",
  "contactEmail": "string (tùy chọn)"
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

**Response 400:** Đã có đơn đăng ký đang chờ (pending) hoặc đã được duyệt (approved)
**Response 403:** Người dùng chưa ACTIVE

---

#### `GET /api/admin/mentor-applications`
**Mục đích:** Admin xem danh sách đơn đăng ký làm mentor
**Actor:** Admin
**File:** `src/app/api/admin/mentor-applications/route.ts`

**Query Params:**
- `status`: PENDING | APPROVED | REJECTED (tùy chọn)
- `page`: number (mặc định 1)
- `pageSize`: number (mặc định 20)

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
**Mục đích:** Admin phê duyệt (approve) hoặc từ chối (reject) đơn đăng ký
**Actor:** Admin
**File:** `src/app/api/admin/mentor-applications/[id]/route.ts`

**Request Body:**
```json
{
  "action": "approve" | "reject",
  "reviewNote": "string (bắt buộc khi reject)"
}
```

**Response 200 (khi approve):**
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

**Side effects khi approve (Các tác vụ phụ):**
1. Cập nhật trạng thái đơn (Application status) -> APPROVED
2. Tạo hồ sơ MentorProfile cho người dùng
3. Cập nhật quyền người dùng (User role) -> MENTOR
4. Ghi log kiểm tra (Audit log)

**Response 200 (khi reject):**
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

### 2.2 Hồ sơ Công khai của Mentor (Mentor Public Profile) (P1)

#### `GET /api/mentor/[id]/public-profile`
**Mục đích:** Xem hồ sơ công khai của mentor
**Actor:** Người dùng đã xác thực (Authenticated - bất kỳ quyền nào)
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
      "name": "Quỹ Thiện Nguyện",
      "accountNo": "2000"
    }
  },
  "teachingFields": [
    { "id": "cuid", "name": "Lập trình", "icon": "💻" }
  ],
  "availabilitySlots": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "12:00" }
  ]
}
```

---

### 2.3 Buổi học - Xác nhận Kép (Session - Dual Confirmation) (P1)

#### `POST /api/sessions/[id]/confirm-completion`
**Mục đích:** Mentor hoặc mentee xác nhận buổi học hoàn tất
**Actor:** Mentor hoặc Mentee của buổi học đó
**File:** `src/app/api/sessions/[id]/confirm-completion/route.ts`

**Request Body:**
```json
{
  "meetLink": "https://meet.google.com/xxx-yyyy-zzz"  // Chỉ cần khi mentor xác nhận lần đầu
}
```
(Body có thể rỗng nếu mentee xác nhận hoặc mentor đã nhập link trước đó)

**Response 200:**
```json
{
  "success": true,
  "session": {
    "id": "cuid",
    "status": "CONFIRMED",        // hoặc "COMPLETED" / "PAYMENT_PENDING"
    "mentorConfirmed": true,
    "menteeConfirmed": false,
    "meetLink": "https://meet.google.com/..."
  },
  "message": "Mentor đã xác nhận. Chờ mentee xác nhận."
}
```

**Logic xử lý:**
1. Kiểm tra user là mentor hoặc mentee của buổi học
2. Nếu là mentor -> thiết lập mentorConfirmed = true (+ meetLink nếu có)
3. Nếu là mentee -> thiết lập menteeConfirmed = true
4. Nếu cả hai đã xác nhận (mentorConfirmed && menteeConfirmed):
   - Phí học > 0 -> trạng thái (status) = PAYMENT_PENDING
   - Phí học = 0 -> trạng thái (status) = COMPLETED
5. Trả về thông tin buổi học đã cập nhật (updated session)

---

### 2.4 Buổi học - Vắng mặt (Session - No-show) (P1)

#### `POST /api/sessions/[id]/no-show`
**Mục đích:** Mentor đánh dấu mentee vắng mặt
**Actor:** Mentor của buổi học
**File:** `src/app/api/sessions/[id]/no-show/route.ts`

**Request Body:**
```json
{
  "reason": "string (tùy chọn)"
}
```

**Response 200:**
```json
{
  "success": true,
  "session": {
    "id": "cuid",
    "status": "PAYMENT_PENDING",  // hoặc "NO_SHOW" tùy theo học phí
    "isNoShow": true,
    "noShowMarkedBy": "mentor_cuid"
  }
}
```

**Logic xử lý:**
1. Validate mentor là người phụ trách buổi học, trạng thái trong khoảng [CONFIRMED, IN_PROGRESS]
2. Validate thời gian scheduledAt đã qua (không cho phép đánh dấu vắng mặt trước giờ học)
3. Thiết lập isNoShow = true, noShowMarkedBy = mentorId
4. Theo OQ05.1: Nếu học phí > 0 -> trạng thái = PAYMENT_PENDING (vẫn phát sinh thanh toán)
5. Nếu học phí = 0 -> trạng thái = NO_SHOW (ghi nhận vắng mặt, không có thanh toán)
6. Tăng biến đếm số lần vắng mặt của mentee (mentee noShowCount)

---

### 2.5 Quản lý Tài khoản Thiện nguyện (Charity Account Management) (P1)

#### `GET /api/admin/charity-accounts`
**Actor:** Admin
**File:** `src/app/api/admin/charity-accounts/route.ts`

**Query Params:**
- `isActive`: boolean (tùy chọn)
- `includeDeleted`: boolean (mặc định false)

**Response 200:**
```json
{
  "accounts": [
    {
      "id": "cuid",
      "name": "Quỹ Thiện Nguyện",
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
  "name": "string (bắt buộc)",
  "accountNo": "string (bắt buộc, 4 chữ số)",
  "bankName": "string (mặc định: MB Bank)",
  "campaignKeyword": "string (tùy chọn)",
  "description": "string (tùy chọn)",
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
  "name": "string (tùy chọn)",
  "bankName": "string (tùy chọn)",
  "campaignKeyword": "string (tùy chọn)",
  "isActive": "boolean (tùy chọn)",
  "isDefault": "boolean (tùy chọn)"
}
```

---

#### `DELETE /api/admin/charity-accounts/[id]`
**Actor:** Admin
**File:** `src/app/api/admin/charity-accounts/[id]/route.ts`

**Response 200:** Xóa cứng thành công (Hard delete - khi usageCount = 0)
**Response 400:** Không thể xóa - tài khoản đang được sử dụng. Gợi ý vô hiệu hóa (deactivate) thay vì xóa (delete).

---

### 2.6 Cấu hình Hệ thống (System Config) (P1)

#### `GET /api/admin/config`
**Actor:** Admin
**File:** `src/app/api/admin/config/route.ts`

**Response 200:**
```json
{
  "configs": [
    { "key": "activation_amount", "value": "10000", "description": "Số tiền kích hoạt (VND)" },
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

### 2.7 Thống kê (Statistics) (P2)

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

### 2.8 Báo cáo (Reports) (P2)

#### `POST /api/reports`
**Actor:** Mentee
**File:** `src/app/api/reports/route.ts`

**Request Body:**
```json
{
  "reportedUserId": "cuid (bắt buộc)",
  "sessionId": "cuid (tùy chọn)",
  "reason": "INAPPROPRIATE | MISCONDUCT | NO_SHOW_DISPUTE | OTHER",
  "description": "string (bắt buộc, tối thiểu 20 ký tự)"
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
  "reviewNote": "string (bắt buộc)"
}
```

---

## 3. API Endpoints CẦN SỬA ĐỔI

### 3.1 `POST /api/sessions` - Thêm Validations (Kiểm tra dữ liệu)

**Thêm các kiểm tra:**
```
1. Nếu (học phí > 0 && user.status !== "ACTIVE") -> 403 "Cần kích hoạt tài khoản"
2. Nếu (activeBookingCount >= maxActiveBookings) -> 400 "Đã có lịch học đang hoạt động"
3. Nếu (scheduledAt - now < minAdvanceHours * 3600000) -> 400 "Cần đặt trước ít nhất X giờ"
4. Nếu (durationMinutes % 60 !== 0) -> 400 "Thời lượng phải là giờ chẵn (ví dụ 60, 120 phút)"
5. Nếu (conflictingSession) -> 400 "Mentor đã có buổi học vào thời gian này"
6. Nếu (mentor.onlyActivatedMentee && user.status !== "ACTIVE") -> 403 "Mentor chỉ nhận mentee đã kích hoạt"
```

### 3.2 `PATCH /api/sessions/[id]` - Sửa Logic Hủy (Cancel)

**Khi action = "cancel":**
```
1. Tính toán số phút còn lại trước khi bắt đầu (minutesBeforeStart)
2. Nếu (minutesBeforeStart <= lateThreshold) -> đánh dấu hủy muộn (isLateCancellation)
3. Tăng biến đếm số lần hủy muộn của người dùng (user lateCancellationCount)
```

### 3.3 `POST /api/payments/session-fee` - Sửa Tài khoản Thiện nguyện

**Sửa lại:**
```
// Lấy tài khoản thiện nguyện từ MentorProfile thay vì mặc định
// Thứ tự ưu tiên: charityAccount -> tnAccountNo -> default
```

### 3.4 `PUT /api/mentor/profile` - Refactor qua Use Case

**Hiện tại:** API gọi trực tiếp qua Prisma
**Sau khi sửa:** API sẽ gọi qua `UpdateMentorProfileUseCase` (có kèm validation + lưu vết audit)

---

## 4. Tóm tắt Xác thực & Phân quyền (Authentication & Authorization)

| Vai trò (Role) | Quyền truy cập Endpoints |
|------|-----------------|
| **Public** | `/api/auth/*`, `/api/teaching-fields` |
| **Authenticated** | `/api/users/profile`, `/api/sessions` (GET), `/api/leaderboard`, `/api/mentor/[id]/public-profile` |
| **Mentee** | `/api/sessions` (POST), `/api/mentor/apply`, `/api/mentee/stats`, `/api/reports` (POST), `/api/sessions/[id]/confirm-completion` |
| **Mentor** | `/api/mentor/profile`, `/api/mentor/availability`, `/api/mentor/stats`, `/api/sessions/[id]/confirm-completion`, `/api/sessions/[id]/no-show` |
| **Admin** | `/api/admin/*` (người dùng, lĩnh vực giảng dạy, đơn đăng ký mentor, tài khoản thiện nguyện, cấu hình, báo cáo) |

---

## 5. Định dạng Phản hồi Lỗi (Error Response Format - Chuẩn hóa)

Tất cả các lỗi API trả về theo định dạng thống nhất:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mô tả lỗi bằng tiếng Việt",
    "details": {}
  }
}
```

**Mã lỗi chuẩn (Error codes):**
| Mã lỗi (Code) | HTTP Status | Mô tả |
|------|------------|-------|
| `UNAUTHORIZED` | 401 | Chưa đăng nhập |
| `FORBIDDEN` | 403 | Không có quyền truy cập |
| `NOT_FOUND` | 404 | Tài nguyên không tồn tại |
| `VALIDATION_ERROR` | 400 | Dữ liệu không hợp lệ |
| `CONFLICT` | 409 | Xung đột hoặc trùng lặp (vd: đã có đơn đăng ký) |
| `BUSINESS_RULE_VIOLATION` | 422 | Vi phạm quy tắc nghiệp vụ |
| `INTERNAL_ERROR` | 500 | Lỗi hệ thống |
