# HọcTừThiện - Thay đổi Lược đồ (Schema Changes)

**Dự án:** HọcTừThiện
**Ngày:** 27/03/2026
**Phiên bản:** v0.1
**Tệp:** `prisma/schema.prisma`

---

## 1. Tổng quan

### Các Model mới (3)
| Model | Mục đích | Liên quan BR |
|-------|---------|-------------|
| `CharityAccount` | Quản lý danh sách tài khoản thiện nguyện | BR19, BR20, BR21 |
| `SystemConfig` | Cấu hình hệ thống (key-value) | BR28 |
| `Report` | Báo cáo vi phạm | BR25, BR27 |

### Các Model sửa đổi (4)
| Model | Thay đổi | Liên quan BR |
|-------|---------|-------------|
| `LearningSession` | Thêm các trường xác nhận kép (dual confirmation), hủy muộn (late cancel), vắng mặt (no-show) | BR31, BR35, BR37 |
| `User` | Thêm lateCancellationCount | BR36 |
| `MenteeProfile` | Thêm noShowCount | BR37 |
| `MentorProfile` | Thêm charityAccountId, onlyActivatedMentee | BR06, BR08 |

### Enums (Value Objects)
| Enum | Thay đổi |
|------|---------|
| `SessionStatus` | Thêm `NO_SHOW` |

---

## 2. Các Model MỚI - Chi tiết Prisma Schema

### 2.1 CharityAccount

```prisma
model CharityAccount {
  id                String    @id @default(cuid())
  name              String                          // Tên tài khoản / tổ chức
  accountNo         String    @unique               // Số tài khoản TN App (vd: "2000")
  bankName          String    @default("MB Bank")   // Tên ngân hàng
  campaignKeyword   String?                         // Từ khóa chiến dịch (tùy chọn)
  description       String?                         // Mô tả thêm
  isActive          Boolean   @default(true)        // Còn hoạt động?
  isDefault         Boolean   @default(false)       // Là tài khoản mặc định cho activation?
  usageCount        Int       @default(0)           // Số lần sử dụng (denormalized counter)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  createdBy         String?
  isDeleted         Boolean   @default(false)
  deletedAt         DateTime?

  // Relations
  mentorProfiles    MentorProfile[]                 // Các mentor sử dụng account này

  @@index([isActive, isDeleted])
}
```

**Giải thích:**
- `accountNo` là unique vì mỗi tài khoản TN App chỉ có 1 bản ghi
- `isDefault` chỉ 1 bản ghi có thể là true tại 1 thời điểm (bắt buộc trong use case)
- `usageCount` là bộ đếm phi chuẩn hóa (denormalized counter) để kiểm tra nhanh trước khi xóa (BR20)
- Khi `isDeleted = true` hoặc `isActive = false` -> không cho mentor chọn nữa (BR21)

**Dữ liệu mẫu (Seed data):**
```typescript
// Tài khoản kích hoạt mặc định
{
  name: "Quỹ Thiện Nguyện",
  accountNo: "2000",
  bankName: "MB Bank",
  isActive: true,
  isDefault: true,
}
```

---

### 2.2 SystemConfig

```prisma
model SystemConfig {
  id          String    @id @default(cuid())
  key         String    @unique                  // Config key (vd: "activation_amount")
  value       String                             // Config value (chuỗi, parse trong code)
  description String?                            // Mô tả cho admin hiểu
  updatedAt   DateTime  @updatedAt
  updatedBy   String?

  @@index([key])
}
```

**Các config key mặc định:**

| Key | Giá trị mặc định | Kiểu | Mô tả |
|-----|--------------|------|-------|
| `activation_amount` | `"10000"` | number | Số tiền kích hoạt tài khoản (VNĐ) |
| `default_charity_account_id` | `"{cuid}"` | string | ID CharityAccount mặc định |
| `min_booking_advance_hours` | `"1"` | number | Số giờ tối thiểu đặt trước |
| `late_cancel_threshold_minutes` | `"30"` | number | Ngưỡng hủy muộn (phút) |
| `payment_expiry_hours` | `"24"` | number | Thời hạn thanh toán (giờ) |
| `max_active_bookings` | `"1"` | number | Số booking active tối đa / mentee |

**Dữ liệu mẫu (Seed data):**
```typescript
const defaultConfigs = [
  { key: "activation_amount", value: "10000", description: "Số tiền kích hoạt tài khoản (VNĐ)" },
  { key: "min_booking_advance_hours", value: "1", description: "Số giờ tối thiểu đặt lịch trước" },
  { key: "late_cancel_threshold_minutes", value: "30", description: "Ngưỡng hủy muộn (phút trước giờ bắt đầu)" },
  { key: "payment_expiry_hours", value: "24", description: "Thời hạn thanh toán sau buổi học (giờ)" },
  { key: "max_active_bookings", value: "1", description: "Số booking đang hoạt động tối đa mỗi mentee" },
];
```

---

### 2.3 Report

```prisma
model Report {
  id              String    @id @default(cuid())
  reporterId      String                          // Người báo cáo
  reportedUserId  String                          // Người bị báo cáo
  sessionId       String?                         // Buổi học liên quan (tùy chọn)
  reason          String                          // Lý do (kiểu enum: INAPPROPRIATE, MISCONDUCT, NO_SHOW_DISPUTE, OTHER)
  description     String                          // Mô tả chi tiết
  status          String    @default("PENDING")   // PENDING, REVIEWED, RESOLVED, DISMISSED
  reviewedBy      String?                         // Admin xử lý
  reviewedAt      DateTime?
  reviewNote      String?                         // Ghi chú của admin
  createdAt       DateTime  @default(now())

  // Relations
  reporter        User      @relation("ReportsMade", fields: [reporterId], references: [id])
  reportedUser    User      @relation("ReportsReceived", fields: [reportedUserId], references: [id])
  session         LearningSession? @relation(fields: [sessionId], references: [id])

  @@index([status])
  @@index([reportedUserId])
}
```

**Giải thích:**
- `reason` là chuỗi, sử dụng các giá trị kiểu enum để dễ mở rộng
- Luồng `status`: PENDING -> REVIEWED -> RESOLVED hoặc DISMISSED
- Liên kết với session để admin có ngữ cảnh (context)

---

## 3. Các Model SỬA ĐỔI - Chi tiết

### 3.1 LearningSession - Thêm trường

```prisma
model LearningSession {
  // ... existing fields ...

  // MỚI - Xác nhận kép (BR31)
  mentorConfirmed    Boolean   @default(false)    // Mentor xác nhận buổi học hoàn tất
  menteeConfirmed    Boolean   @default(false)    // Mentee xác nhận buổi học hoàn tất

  // MỚI - Hủy muộn (BR35)
  isLateCancellation Boolean   @default(false)    // Có phải hủy muộn không

  // MỚI - Vắng mặt (BR37)
  isNoShow           Boolean   @default(false)    // Mentee có vắng mặt không
  noShowMarkedBy     String?                      // Ai đánh dấu vắng mặt (mentor userId)

  // ... existing relations ...

  // MỚI - Report relation
  reports            Report[]
}
```

**Tác động của Migration:**
- Tất cả các trường mới đều có giá trị mặc định -> không ảnh hưởng dữ liệu cũ
- Không cần migrate dữ liệu cho các bản ghi hiện tại

---

### 3.2 User - Thêm trường

```prisma
model User {
  // ... existing fields ...

  // MỚI - Theo dõi hủy muộn (BR36)
  lateCancellationCount  Int   @default(0)

  // ... existing relations ...

  // MỚI - Report relations
  reportsMade        Report[]  @relation("ReportsMade")
  reportsReceived    Report[]  @relation("ReportsReceived")
}
```

---

### 3.3 MenteeProfile - Thêm trường

```prisma
model MenteeProfile {
  // ... existing fields ...

  // MỚI - Theo dõi vắng mặt
  noShowCount  Int  @default(0)
}
```

---

### 3.4 MentorProfile - Thêm trường

```prisma
model MentorProfile {
  // ... existing fields ...

  // MỚI - Tài khoản thiện nguyện (BR08)
  charityAccountId   String?
  charityAccount     CharityAccount?  @relation(fields: [charityAccountId], references: [id])

  // MỚI - Tùy chọn của mentor (BR06)
  onlyActivatedMentee  Boolean  @default(false)   // Chỉ nhận mentee đã kích hoạt

  // ... existing relations ...
}
```

**Giải thích:**
- `charityAccountId` thay thế `tnAccountNo` hiện tại? KHÔNG - giữ cả 2:
  - `charityAccountId` là khóa ngoại (FK) đến CharityAccount (đã xác thực)
  - `tnAccountNo`, `tnAccountName` vẫn giữ lại để tương thích ngược (backward compatible)
  - Logic: ưu tiên charityAccountId, dự phòng (fallback) về tnAccountNo
- `onlyActivatedMentee`: mentor có thể bật/tắt tùy chọn này (BR06, P2)

---

## 4. Khác biệt toàn bộ Lược đồ (Full Schema Diff)

```diff
// === CÁC MODEL MỚI ===

+ model CharityAccount {
+   id                String    @id @default(cuid())
+   name              String
+   accountNo         String    @unique
+   bankName          String    @default("MB Bank")
+   campaignKeyword   String?
+   description       String?
+   isActive          Boolean   @default(true)
+   isDefault         Boolean   @default(false)
+   usageCount        Int       @default(0)
+   createdAt         DateTime  @default(now())
+   updatedAt         DateTime  @updatedAt
+   createdBy         String?
+   isDeleted         Boolean   @default(false)
+   deletedAt         DateTime?
+   mentorProfiles    MentorProfile[]
+   @@index([isActive, isDeleted])
+ }

+ model SystemConfig {
+   id          String    @id @default(cuid())
+   key         String    @unique
+   value       String
+   description String?
+   updatedAt   DateTime  @updatedAt
+   updatedBy   String?
+   @@index([key])
+ }

+ model Report {
+   id              String    @id @default(cuid())
+   reporterId      String
+   reportedUserId  String
+   sessionId       String?
+   reason          String
+   description     String
+   status          String    @default("PENDING")
+   reviewedBy      String?
+   reviewedAt      DateTime?
+   reviewNote      String?
+   createdAt       DateTime  @default(now())
+   reporter        User      @relation("ReportsMade", fields: [reporterId], references: [id])
+   reportedUser    User      @relation("ReportsReceived", fields: [reportedUserId], references: [id])
+   session         LearningSession? @relation(fields: [sessionId], references: [id])
+   @@index([status])
+   @@index([reportedUserId])
+ }

// === CÁC MODEL SỬA ĐỔI ===

  model User {
    // ... existing ...
+   lateCancellationCount  Int       @default(0)
+   reportsMade            Report[]  @relation("ReportsMade")
+   reportsReceived        Report[]  @relation("ReportsReceived")
  }

  model MenteeProfile {
    // ... existing ...
+   noShowCount  Int  @default(0)
  }

  model MentorProfile {
    // ... existing ...
+   charityAccountId     String?
+   onlyActivatedMentee  Boolean  @default(false)
+   charityAccount       CharityAccount?  @relation(fields: [charityAccountId], references: [id])
  }

  model LearningSession {
    // ... existing ...
+   mentorConfirmed    Boolean   @default(false)
+   menteeConfirmed    Boolean   @default(false)
+   isLateCancellation Boolean   @default(false)
+   isNoShow           Boolean   @default(false)
+   noShowMarkedBy     String?
+   reports            Report[]
  }
```

---

## 5. Kế hoạch Migration

### Bước 1: Tạo file migration
```bash
npx prisma migrate dev --name add_charity_config_report_models
```

### Bước 2: Thêm dữ liệu mẫu mới (Seed data)
```typescript
// prisma/seed.ts - thêm:

// 1. Tài khoản thiện nguyện mặc định
const defaultCharity = await prisma.charityAccount.upsert({
  where: { accountNo: "2000" },
  update: {},
  create: {
    name: "Quỹ Thiện Nguyện",
    accountNo: "2000",
    bankName: "MB Bank",
    isActive: true,
    isDefault: true,
  },
});

// 2. Cấu hình hệ thống (System Configs)
const configs = [
  { key: "activation_amount", value: "10000", description: "Số tiền kích hoạt tài khoản (VNĐ)" },
  { key: "min_booking_advance_hours", value: "1", description: "Số giờ tối thiểu đặt lịch trước" },
  { key: "late_cancel_threshold_minutes", value: "30", description: "Ngưỡng hủy muộn (phút)" },
  { key: "payment_expiry_hours", value: "24", description: "Thời hạn thanh toán (giờ)" },
  { key: "max_active_bookings", value: "1", description: "Số booking active tối đa / mentee" },
];

for (const config of configs) {
  await prisma.systemConfig.upsert({
    where: { key: config.key },
    update: {},
    create: config,
  });
}
```

### Bước 3: Kiểm tra (Verify) migration
```bash
npx prisma studio
# Kiểm tra các bảng (tables) mới đã được tạo
# Kiểm tra các cột (columns) mới trên các bảng cũ
```

---

## 6. Đề xuất Index

```prisma
// Đã có:
// User.email @@unique
// Payment.transactionCode @@unique
// MentorTeachingField @@unique([mentorProfileId, teachingFieldId])

// MỚI:
// CharityAccount @@index([isActive, isDeleted])
// SystemConfig @@index([key])  -- tuy nhiên @unique đã tự tạo index
// Report @@index([status])
// Report @@index([reportedUserId])

// ĐỀ XUẤT THÊM:
// LearningSession @@index([menteeId, status])  -- cho countActiveByMenteeId
// LearningSession @@index([mentorId, scheduledAt])  -- cho phát hiện xung đột (conflict detection)
// Payment @@index([userId, type, status])  -- cho findPendingByUserId
```

---

## 7. Ghi chú về tính toàn vẹn dữ liệu (Data Integrity Notes)

1. **CharityAccount.usageCount** là bộ đếm phi chuẩn hóa (denormalized counter):
   - Tăng khi mentor chọn account cho profile
   - Tăng khi thanh toán (payment) sử dụng account
   - Dùng để kiểm tra nhanh trước khi xóa
   - Nếu sai lệch -> có thể tính toán lại (recalculate) từ các bảng MentorProfile + Payment

2. **User.lateCancellationCount** là bộ đếm phi chuẩn hóa:
   - Tăng khi hủy muộn (isLateCancellation = true)
   - Có thể tính toán lại từ LearningSession WHERE cancelledBy = userId AND isLateCancellation = true

3. **MenteeProfile.noShowCount** là bộ đếm phi chuẩn hóa:
   - Tăng khi bị đánh dấu vắng mặt (no-show)
   - Có thể tính toán lại từ LearningSession WHERE menteeId = userId AND isNoShow = true

4. **MentorProfile.charityAccountId** so với `tnAccountNo`:
   - `charityAccountId` là cách mới (đã xác thực thông qua bảng CharityAccount)
   - `tnAccountNo` vẫn giữ lại để tương thích ngược (backward compatibility)
   - Logic thanh toán (Payment): ưu tiên charityAccount -> dự phòng tnAccountNo -> dự phòng mặc định (default)
