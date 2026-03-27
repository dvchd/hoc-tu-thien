# HocTuThien - Schema Changes

**Project:** HocTuThien
**Date:** 27/03/2026
**Version:** v0.1
**File:** `prisma/schema.prisma`

---

## 1. Tong quan

### Models moi (3)
| Model | Muc dich | Lien quan BR |
|-------|---------|-------------|
| `CharityAccount` | Quan ly danh sach tai khoan thien nguyen | BR19, BR20, BR21 |
| `SystemConfig` | Cau hinh he thong (key-value) | BR28 |
| `Report` | Bao cao vi pham | BR25, BR27 |

### Models sua doi (4)
| Model | Thay doi | Lien quan BR |
|-------|---------|-------------|
| `LearningSession` | Them dual confirmation, late cancel, no-show fields | BR31, BR35, BR37 |
| `User` | Them lateCancellationCount | BR36 |
| `MenteeProfile` | Them noShowCount | BR37 |
| `MentorProfile` | Them charityAccountId, onlyActivatedMentee | BR06, BR08 |

### Enums (Value Objects)
| Enum | Thay doi |
|------|---------|
| `SessionStatus` | Them `NO_SHOW` |

---

## 2. Models MOI - Chi tiet Prisma Schema

### 2.1 CharityAccount

```prisma
model CharityAccount {
  id                String    @id @default(cuid())
  name              String                          // Ten tai khoan / to chuc
  accountNo         String    @unique               // So tai khoan TN App (vd: "2000")
  bankName          String    @default("MB Bank")   // Ten ngan hang
  campaignKeyword   String?                         // Tu khoa chien dich (optional)
  description       String?                         // Mo ta them
  isActive          Boolean   @default(true)        // Con hoat dong?
  isDefault         Boolean   @default(false)       // La tai khoan mac dinh cho activation?
  usageCount        Int       @default(0)           // So lan su dung (denormalized counter)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  createdBy         String?
  isDeleted         Boolean   @default(false)
  deletedAt         DateTime?

  // Relations
  mentorProfiles    MentorProfile[]                 // Mentors su dung account nay

  @@index([isActive, isDeleted])
}
```

**Giai thich:**
- `accountNo` la unique vi moi TN App account chi co 1 entry
- `isDefault` chi 1 record co the la true tai 1 thoi diem (enforce trong use case)
- `usageCount` la denormalized counter de check nhanh truoc khi delete (BR20)
- Khi `isDeleted = true` hoac `isActive = false` -> khong cho mentor chon nua (BR21)

**Seed data:**
```typescript
// Default activation account
{
  name: "Quy Thien Nguyen",
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
  value       String                             // Config value (string, parse trong code)
  description String?                            // Mo ta cho admin hieu
  updatedAt   DateTime  @updatedAt
  updatedBy   String?

  @@index([key])
}
```

**Config keys mac dinh:**

| Key | Default Value | Type | Mo ta |
|-----|--------------|------|-------|
| `activation_amount` | `"10000"` | number | So tien kich hoat tai khoan (VND) |
| `default_charity_account_id` | `"{cuid}"` | string | ID CharityAccount mac dinh |
| `min_booking_advance_hours` | `"1"` | number | So gio toi thieu dat truoc |
| `late_cancel_threshold_minutes` | `"30"` | number | Nguong huy muon (phut) |
| `payment_expiry_hours` | `"24"` | number | Thoi han thanh toan (gio) |
| `max_active_bookings` | `"1"` | number | So booking active toi da / mentee |

**Seed data:**
```typescript
const defaultConfigs = [
  { key: "activation_amount", value: "10000", description: "So tien kich hoat tai khoan (VND)" },
  { key: "min_booking_advance_hours", value: "1", description: "So gio toi thieu dat lich truoc" },
  { key: "late_cancel_threshold_minutes", value: "30", description: "Nguong huy muon (phut truoc gio bat dau)" },
  { key: "payment_expiry_hours", value: "24", description: "Thoi han thanh toan sau buoi hoc (gio)" },
  { key: "max_active_bookings", value: "1", description: "So booking dang hoat dong toi da moi mentee" },
];
```

---

### 2.3 Report

```prisma
model Report {
  id              String    @id @default(cuid())
  reporterId      String                          // User bao cao
  reportedUserId  String                          // User bi bao cao
  sessionId       String?                         // Buoi hoc lien quan (optional)
  reason          String                          // Ly do (enum-like: INAPPROPRIATE, MISCONDUCT, NO_SHOW_DISPUTE, OTHER)
  description     String                          // Mo ta chi tiet
  status          String    @default("PENDING")   // PENDING, REVIEWED, RESOLVED, DISMISSED
  reviewedBy      String?                         // Admin xu ly
  reviewedAt      DateTime?
  reviewNote      String?                         // Ghi chu cua admin
  createdAt       DateTime  @default(now())

  // Relations
  reporter        User      @relation("ReportsMade", fields: [reporterId], references: [id])
  reportedUser    User      @relation("ReportsReceived", fields: [reportedUserId], references: [id])
  session         LearningSession? @relation(fields: [sessionId], references: [id])

  @@index([status])
  @@index([reportedUserId])
}
```

**Giai thich:**
- `reason` la string, su dung enum-like values de de mo rong
- `status` flow: PENDING -> REVIEWED -> RESOLVED hoac DISMISSED
- Lien ket voi session de admin co context

---

## 3. Models SUA DOI - Chi tiet

### 3.1 LearningSession - Them fields

```prisma
model LearningSession {
  // ... existing fields ...

  // MOI - Dual Confirmation (BR31)
  mentorConfirmed    Boolean   @default(false)    // Mentor xac nhan buoi hoc hoan tat
  menteeConfirmed    Boolean   @default(false)    // Mentee xac nhan buoi hoc hoan tat

  // MOI - Late Cancellation (BR35)
  isLateCancellation Boolean   @default(false)    // Co phai huy muon khong

  // MOI - No-show (BR37)
  isNoShow           Boolean   @default(false)    // Mentee co vang mat khong
  noShowMarkedBy     String?                      // Ai danh dau no-show (mentor userId)

  // ... existing relations ...

  // MOI - Report relation
  reports            Report[]
}
```

**Migration impact:**
- Tat ca fields moi deu co default value -> khong anh huong data cu
- Khong can data migration cho existing records

---

### 3.2 User - Them fields

```prisma
model User {
  // ... existing fields ...

  // MOI - Late Cancellation tracking (BR36)
  lateCancellationCount  Int   @default(0)

  // ... existing relations ...

  // MOI - Report relations
  reportsMade        Report[]  @relation("ReportsMade")
  reportsReceived    Report[]  @relation("ReportsReceived")
}
```

---

### 3.3 MenteeProfile - Them fields

```prisma
model MenteeProfile {
  // ... existing fields ...

  // MOI - No-show tracking
  noShowCount  Int  @default(0)
}
```

---

### 3.4 MentorProfile - Them fields

```prisma
model MentorProfile {
  // ... existing fields ...

  // MOI - Charity Account (BR08)
  charityAccountId   String?
  charityAccount     CharityAccount?  @relation(fields: [charityAccountId], references: [id])

  // MOI - Mentor preference (BR06)
  onlyActivatedMentee  Boolean  @default(false)   // Chi nhan mentee da kich hoat

  // ... existing relations ...
}
```

**Giai thich:**
- `charityAccountId` thay the `tnAccountNo` hien tai? KHONG - giu ca 2:
  - `charityAccountId` la FK den CharityAccount (validated)
  - `tnAccountNo`, `tnAccountName` van giu de backward compatible
  - Logic: uu tien charityAccountId, fallback ve tnAccountNo
- `onlyActivatedMentee`: mentor co the bat/tat tuy chon nay (BR06, P2)

---

## 4. Full Schema Diff

```diff
// === MODELS MOI ===

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

// === MODELS SUA DOI ===

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

## 5. Migration Plan

### Step 1: Tao migration file
```bash
npx prisma migrate dev --name add_charity_config_report_models
```

### Step 2: Seed data moi
```typescript
// prisma/seed.ts - them:

// 1. Default Charity Account
const defaultCharity = await prisma.charityAccount.upsert({
  where: { accountNo: "2000" },
  update: {},
  create: {
    name: "Quy Thien Nguyen",
    accountNo: "2000",
    bankName: "MB Bank",
    isActive: true,
    isDefault: true,
  },
});

// 2. System Configs
const configs = [
  { key: "activation_amount", value: "10000", description: "So tien kich hoat tai khoan (VND)" },
  { key: "min_booking_advance_hours", value: "1", description: "So gio toi thieu dat lich truoc" },
  { key: "late_cancel_threshold_minutes", value: "30", description: "Nguong huy muon (phut)" },
  { key: "payment_expiry_hours", value: "24", description: "Thoi han thanh toan (gio)" },
  { key: "max_active_bookings", value: "1", description: "So booking active toi da / mentee" },
];

for (const config of configs) {
  await prisma.systemConfig.upsert({
    where: { key: config.key },
    update: {},
    create: config,
  });
}
```

### Step 3: Verify migration
```bash
npx prisma studio
# Kiem tra cac tables moi da duoc tao
# Kiem tra cac columns moi tren tables cu
```

---

## 6. Index Recommendations

```prisma
// Da co:
// User.email @@unique
// Payment.transactionCode @@unique
// MentorTeachingField @@unique([mentorProfileId, teachingFieldId])

// MOI:
// CharityAccount @@index([isActive, isDeleted])
// SystemConfig @@index([key])  -- tuy nhien @unique da tu tao index
// Report @@index([status])
// Report @@index([reportedUserId])

// DE XUAT THEM:
// LearningSession @@index([menteeId, status])  -- cho countActiveByMenteeId
// LearningSession @@index([mentorId, scheduledAt])  -- cho conflict detection
// Payment @@index([userId, type, status])  -- cho findPendingByUserId
```

---

## 7. Data Integrity Notes

1. **CharityAccount.usageCount** la denormalized counter:
   - Tang khi mentor chon account cho profile
   - Tang khi payment su dung account
   - Dung de quick-check truoc khi delete
   - Neu sai lech -> co the recalculate tu MentorProfile + Payment tables

2. **User.lateCancellationCount** la denormalized counter:
   - Tang khi huy muon (isLateCancellation = true)
   - Co the recalculate tu LearningSession WHERE cancelledBy = userId AND isLateCancellation = true

3. **MenteeProfile.noShowCount** la denormalized counter:
   - Tang khi bi danh dau no-show
   - Co the recalculate tu LearningSession WHERE menteeId = userId AND isNoShow = true

4. **MentorProfile.charityAccountId** vs `tnAccountNo`:
   - `charityAccountId` la cach moi (validated against CharityAccount)
   - `tnAccountNo` van giu lai cho backward compatibility
   - Payment logic: uu tien charityAccount -> fallback tnAccountNo -> fallback default
