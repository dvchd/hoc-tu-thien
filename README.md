# 🎓 Học Từ Thiện — Nền tảng Kết nối Mentor & Mentee

> **"Học Từ Thiện"** là nền tảng học tập phi lợi nhuận, kết nối Mentor (người hướng dẫn) với Mentee (người học) thông qua các buổi học trực tuyến có phí tượng trưng. Toàn bộ học phí được chuyển thẳng đến Mentor, hệ thống không thu phí trung gian.

---

## 📋 Mục lục

- [Tổng quan dự án](#-tổng-quan-dự-án)
- [Tính năng chính](#-tính-năng-chính)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Cơ sở dữ liệu](#-cơ-sở-dữ-liệu)
- [Luồng nghiệp vụ](#-luồng-nghiệp-vụ)
- [API Routes](#-api-routes)
- [Cài đặt & Chạy dự án](#-cài-đặt--chạy-dự-án)
- [Biến môi trường](#-biến-môi-trường)
- [Kiểm thử](#-kiểm-thử)
- [Triển khai](#-triển-khai)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Đóng góp](#-đóng-góp)

---

## 🌟 Tổng quan dự án

**Học Từ Thiện** là ứng dụng web được xây dựng bằng **Next.js 14** theo kiến trúc **Clean Architecture / Domain-Driven Design (DDD)**. Hệ thống hỗ trợ ba vai trò người dùng:

| Vai trò | Mô tả |
|---------|-------|
| **ADMIN** | Quản trị viên — quản lý người dùng, lĩnh vực giảng dạy, phê duyệt Mentor |
| **MENTOR** | Người hướng dẫn — tạo hồ sơ, đặt lịch rảnh, nhận buổi học, nhận học phí |
| **MENTEE** | Người học — kích hoạt tài khoản, tìm Mentor, đặt lịch học, thanh toán học phí |

### Điểm đặc biệt

- 🔐 **Xác thực qua Google OAuth** — đăng nhập bằng tài khoản Google
- 💳 **Thanh toán qua Thiện Nguyện App** — xác minh giao dịch chuyển khoản tự động qua API `thiennguyen.app`
- 📹 **Tích hợp Google Meet** — tự động tạo link họp khi buổi học được xác nhận
- 🏆 **Bảng xếp hạng** — hiển thị Mentor nổi bật theo số buổi dạy và đánh giá
- 🧪 **~247 test cases** — Unit, Integration và E2E tests

---

## ✨ Tính năng chính

### Dành cho Mentee
- Đăng nhập bằng Google, tài khoản mặc định ở trạng thái `PENDING_ACTIVATION`
- **Kích hoạt tài khoản** bằng cách chuyển khoản 10.000 VNĐ qua QR VietQR
- Tìm kiếm và lọc Mentor theo lĩnh vực giảng dạy
- Đặt lịch học với Mentor (chọn ngày giờ, tiêu đề, mô tả)
- Thanh toán học phí sau buổi học qua QR VietQR
- Đánh giá Mentor sau khi hoàn thành buổi học
- Xem lịch sử các buổi học

### Dành cho Mentor
- Đăng ký trở thành Mentor (gửi đơn xin, chờ Admin phê duyệt)
- Cập nhật hồ sơ: tiêu đề, chuyên môn, kinh nghiệm, học phí/giờ
- Thiết lập lịch rảnh theo ngày trong tuần
- Xác nhận / Hủy buổi học từ Mentee
- Đánh dấu buổi học hoàn thành
- Nhận học phí trực tiếp qua tài khoản TN App
- Xem thống kê: tổng buổi dạy, tổng thu nhập, đánh giá

### Dành cho Admin
- Quản lý toàn bộ người dùng (xem, đổi vai trò, xóa mềm)
- Quản lý lĩnh vực giảng dạy (thêm, sửa, xóa, sắp xếp)
- Xem thống kê tổng quan hệ thống

---

## 🏗️ Kiến trúc hệ thống

Dự án tuân theo **Clean Architecture** với 4 tầng rõ ràng:

```
┌─────────────────────────────────────────────────────────┐
│                   Presentation Layer                     │
│         (Next.js Pages, React Components, API Routes)    │
├─────────────────────────────────────────────────────────┤
│                   Application Layer                      │
│              (Use Cases, DTOs, Interfaces)               │
├─────────────────────────────────────────────────────────┤
│                     Domain Layer                         │
│         (Entities, Value Objects, Domain Events,         │
│                  Repository Interfaces)                  │
├─────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                     │
│      (Prisma Repositories, External APIs, UoW)           │
└─────────────────────────────────────────────────────────┘
```

### Các nguyên tắc thiết kế áp dụng

| Nguyên tắc | Mô tả |
|-----------|-------|
| **DDD** | Domain Entities, Value Objects, Domain Events, Repository Pattern |
| **Clean Architecture** | Dependency Inversion — tầng trong không phụ thuộc tầng ngoài |
| **Unit of Work** | `PrismaUnitOfWork` đảm bảo tính nhất quán giao dịch |
| **CQRS-lite** | Use Cases tách biệt Command và Query |
| **Soft Delete** | Dữ liệu không bị xóa vĩnh viễn, dùng `isDeleted` + `deletedAt` |
| **Audit Log** | Mọi thay đổi quan trọng đều được ghi vào `UserAuditLog` |
| **Optimistic Locking** | Trường `version` trên các entity để tránh xung đột |

---

## 📁 Cấu trúc thư mục

```
hoc-tu-thien/
├── prisma/
│   ├── schema.prisma          # Định nghĩa schema database
│   └── seed.ts                # Dữ liệu mẫu ban đầu
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Route group: Login, Activation
│   │   ├── (dashboard)/       # Route group: Dashboard các vai trò
│   │   │   └── dashboard/
│   │   │       ├── admin/     # Trang Admin
│   │   │       ├── mentor/    # Trang Mentor
│   │   │       ├── mentee/    # Trang Mentee
│   │   │       ├── leaderboard/
│   │   │       └── settings/
│   │   └── api/               # API Routes (REST)
│   │       ├── auth/          # NextAuth handlers
│   │       ├── admin/         # Admin APIs
│   │       ├── mentor/        # Mentor APIs
│   │       ├── sessions/      # Session APIs
│   │       ├── payments/      # Payment APIs
│   │       ├── leaderboard/
│   │       ├── teaching-fields/
│   │       └── users/
│   │
│   ├── domain/                # 🔴 Domain Layer (core business logic)
│   │   ├── entities/
│   │   │   ├── User.ts        # UserEntity (aggregate root)
│   │   │   └── base/
│   │   │       └── AuditableEntity.ts
│   │   ├── value-objects/
│   │   │   ├── Email.ts
│   │   │   ├── Payment.ts     # PaymentType, PaymentStatus, helpers
│   │   │   ├── UserRole.ts
│   │   │   └── UserStatus.ts
│   │   ├── events/
│   │   │   └── DomainEvents.ts
│   │   └── repositories/      # Repository interfaces (contracts)
│   │       ├── IUserRepository.ts
│   │       ├── ISessionRepository.ts
│   │       └── IPaymentRepository.ts
│   │
│   ├── application/           # 🟡 Application Layer
│   │   ├── dtos/
│   │   │   └── UserDTO.ts
│   │   ├── interfaces/
│   │   │   └── IUnitOfWork.ts
│   │   └── use-cases/
│   │       ├── user/
│   │       │   └── UserUseCases.ts    # FindOrCreate, Get, List, ChangeRole, etc.
│   │       ├── payment/
│   │       │   └── PaymentUseCases.ts # InitiateActivation, VerifyPayment, etc.
│   │       └── session/
│   │           └── SessionUseCases.ts # Book, Confirm, Cancel, Complete, Rate, etc.
│   │
│   ├── infrastructure/        # 🟢 Infrastructure Layer
│   │   ├── database/
│   │   │   ├── prisma/
│   │   │   │   └── client.ts  # Prisma singleton
│   │   │   └── repositories/
│   │   │       ├── PrismaUserRepository.ts
│   │   │       └── PrismaPaymentSessionRepositories.ts
│   │   ├── external/
│   │   │   ├── ThienNguyenAppClient.ts  # API client TN App
│   │   │   └── GoogleMeetService.ts     # Tạo Google Meet link
│   │   └── unit-of-work/
│   │       └── PrismaUnitOfWork.ts
│   │
│   ├── presentation/          # 🔵 Presentation Layer
│   │   └── components/
│   │       ├── activation/    # QR kích hoạt tài khoản
│   │       ├── admin/         # Bảng quản lý users, fields
│   │       ├── layout/        # Sidebar, TopBar
│   │       ├── mentee/        # Tìm Mentor
│   │       ├── mentor/        # Hồ sơ, lịch rảnh
│   │       ├── payment/       # Modal thanh toán
│   │       ├── session/       # Card buổi học
│   │       └── settings/      # Form cài đặt
│   │
│   ├── lib/
│   │   ├── container.ts       # Dependency Injection container
│   │   └── utils.ts           # Tiện ích chung (cn, formatDate, ...)
│   │
│   ├── auth.ts                # NextAuth v5 config
│   ├── middleware.ts           # Route protection middleware
│   └── types/
│       └── next-auth.d.ts     # Mở rộng kiểu Session
│
└── src/__tests__/             # Test suite
    ├── unit/                  # Unit tests (không cần DB)
    ├── integration/           # Integration tests (cần Prisma + SQLite)
    └── e2e/                   # End-to-end scenario tests
```

---

## 🗄️ Cơ sở dữ liệu

Dự án dùng **PostgreSQL** cho cả môi trường development và production thông qua Prisma ORM.

### Sơ đồ quan hệ (ERD tóm tắt)

```
User
 ├── MentorProfile (1-1)
 │    ├── MentorTeachingField (n-n) ── TeachingField
 │    └── AvailabilitySlot (1-n)
 ├── MenteeProfile (1-1)
 ├── MentorApplication (1-1)
 ├── LearningSession (1-n, as mentee)
 ├── LearningSession (1-n, as mentor)
 ├── Payment (1-n)
 │    └── PaymentVerificationLog (1-n)
 └── UserAuditLog (1-n)
```

### Các model chính

| Model | Mô tả |
|-------|-------|
| `User` | Người dùng, có `role` (ADMIN/MENTOR/MENTEE) và `status` (PENDING_ACTIVATION/ACTIVE/INACTIVE/SUSPENDED) |
| `MentorProfile` | Hồ sơ Mentor: tiêu đề, chuyên môn, học phí/giờ, tài khoản TN App |
| `MenteeProfile` | Hồ sơ Mentee: mục tiêu học tập, cấp độ hiện tại |
| `TeachingField` | Lĩnh vực giảng dạy (do Admin quản lý) |
| `AvailabilitySlot` | Lịch rảnh của Mentor theo ngày trong tuần |
| `LearningSession` | Buổi học: trạng thái, thời gian, link Meet, học phí, đánh giá |
| `Payment` | Giao dịch thanh toán: mã giao dịch, trạng thái, tài khoản TN App |
| `PaymentVerificationLog` | Lịch sử kiểm tra giao dịch với TN App API |
| `MentorApplication` | Đơn xin trở thành Mentor |
| `UserAuditLog` | Nhật ký thay đổi của người dùng |

### Trạng thái buổi học (`SessionStatus`)

```
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
    ↓           ↓
CANCELLED   CANCELLED
                         ↓ (sau COMPLETED)
                   PAYMENT_PENDING → (sau khi thanh toán) → COMPLETED
```

---

## 🔄 Luồng nghiệp vụ

### 1. Đăng ký & Kích hoạt tài khoản

```
1. Người dùng đăng nhập bằng Google OAuth
2. Hệ thống tạo User với status = PENDING_ACTIVATION
3. Người dùng vào trang /activation
4. Hệ thống tạo Payment (type=ACTIVATION, amount=10.000 VNĐ)
   → Sinh mã giao dịch: "HOCTUTHIEN KICHHOAT ABCDEFGH"
   → Tạo QR VietQR để quét chuyển khoản
5. Người dùng chuyển khoản và bấm "Tôi đã chuyển khoản"
6. Hệ thống gọi API TN App để xác minh giao dịch
7. Nếu tìm thấy → Payment.status = VERIFIED, User.status = ACTIVE
```

### 2. Đặt lịch học

```
1. Mentee (đã ACTIVE) vào trang "Tìm Mentor"
2. Lọc theo lĩnh vực, xem hồ sơ Mentor
3. Đặt lịch: chọn ngày giờ, tiêu đề, mô tả
4. Hệ thống kiểm tra:
   - Mentee đã ACTIVE chưa?
   - Mentee có buổi học chưa thanh toán không?
   - Mentor có tồn tại và đúng vai trò không?
5. Tạo LearningSession với status = PENDING
6. Mentor nhận thông báo, xác nhận → status = CONFIRMED
   → Hệ thống tạo Google Meet link tự động
```

### 3. Thanh toán học phí

```
1. Sau khi buổi học COMPLETED, status → PAYMENT_PENDING
2. Mentee vào trang Sessions, bấm "Thanh toán học phí"
3. Hệ thống tạo Payment (type=SESSION_FEE)
   → Mã giao dịch: "HOCTUTHIEN HOCPHI ABCDEFGH"
   → QR VietQR chuyển thẳng đến tài khoản TN App của Mentor
4. Mentee chuyển khoản và bấm xác nhận
5. Hệ thống xác minh qua TN App API
6. Nếu thành công → Session.status = COMPLETED (hoàn tất)
```

### 4. Đăng ký Mentor

```
1. Mentee gửi đơn xin (motivation, experience, LinkedIn)
2. Admin xem xét và phê duyệt/từ chối
3. Nếu phê duyệt → User.role = MENTOR
4. Mentor cập nhật hồ sơ và lịch rảnh
```

---

## 🌐 API Routes

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth handlers (Google OAuth) |

### Users
| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| `GET/PATCH` | `/api/users/profile` | Xem/cập nhật hồ sơ cá nhân | Đã đăng nhập |

### Admin
| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| `GET` | `/api/admin/users/role` | Danh sách người dùng | ADMIN |
| `PATCH` | `/api/admin/users/[id]` | Cập nhật thông tin user | ADMIN |
| `DELETE` | `/api/admin/users/[id]` | Xóa mềm user | ADMIN |
| `GET/POST` | `/api/admin/fields` | Danh sách / Tạo lĩnh vực | ADMIN |
| `PATCH/DELETE` | `/api/admin/fields/[id]` | Sửa / Xóa lĩnh vực | ADMIN |

### Mentor
| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| `GET/PUT` | `/api/mentor/profile` | Xem/cập nhật hồ sơ Mentor | MENTOR |
| `GET/POST` | `/api/mentor/availability` | Xem/cập nhật lịch rảnh | MENTOR |
| `POST` | `/api/mentor/apply` | Gửi đơn xin trở thành Mentor | MENTEE |

### Sessions
| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| `GET/POST` | `/api/sessions` | Danh sách / Tạo buổi học | Đã đăng nhập |
| `GET/PATCH` | `/api/sessions/[id]` | Chi tiết / Cập nhật buổi học | Đã đăng nhập |
| `POST` | `/api/sessions/[id]/payment` | Khởi tạo thanh toán học phí | MENTEE |

### Payments
| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| `POST` | `/api/payments/session-fee` | Khởi tạo thanh toán học phí | MENTEE |
| `POST` | `/api/payments/verify` | Xác minh giao dịch | Đã đăng nhập |

### Khác
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/leaderboard` | Bảng xếp hạng Mentor |
| `GET` | `/api/teaching-fields` | Danh sách lĩnh vực giảng dạy |

---

## 🚀 Cài đặt & Chạy dự án

### Yêu cầu hệ thống

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 14 (local hoặc remote)
- Tài khoản **Google Cloud** (để tạo OAuth credentials)

### Bước 1: Clone và cài đặt dependencies

```bash
git clone <repository-url>
cd hoc-tu-thien
npm install
```

### Bước 2: Cấu hình biến môi trường

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với các giá trị thực (xem phần [Biến môi trường](#-biến-môi-trường)).

### Bước 3: Khởi tạo database

Đảm bảo đã có PostgreSQL server và cấu hình `DATABASE_URL` trong `.env`.

```bash
# Đồng bộ schema lên database (tạo bảng)
npx prisma db push

# Tạo Prisma Client
npm run prisma:generate

# Seed dữ liệu mẫu (tạo Admin, Mentor demo, Mentee demo)
npm run prisma:seed
```

### Bước 4: Chạy ứng dụng

```bash
# Development mode
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000)

### Các lệnh hữu ích khác

```bash
# Build production
npm run build

# Chạy production
npm start

# Mở Prisma Studio (GUI quản lý DB)
npm run prisma:studio

# Reset database và seed lại
npm run db:reset

# Lint code
npm run lint
```

---

## ⚙️ Biến môi trường

Tạo file `.env` từ `.env.example` và điền các giá trị:

```env
# ─── Runtime ──────────────────────────────────────────────────────────────────
# Nixpacks (Railway / Render) sẽ dùng Node 22 để build
NIXPACKS_NODE_VERSION=22

# ─── Database ─────────────────────────────────────────────────────────────────
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/hoc_tu_thien

# ─── NextAuth v5 ──────────────────────────────────────────────────────────────
# NextAuth v5 dùng AUTH_SECRET (thay cho NEXTAUTH_SECRET)
# Generate với: openssl rand -base64 32
AUTH_SECRET=REPLACE_WITH_A_STRONG_RANDOM_SECRET_32_CHARS
# Giữ NEXTAUTH_SECRET để tương thích ngược (code đọc cả hai)
NEXTAUTH_SECRET=REPLACE_WITH_A_STRONG_RANDOM_SECRET_32_CHARS
# Production URL (phải khớp với domain thực tế, không có dấu / cuối)
NEXTAUTH_URL=https://demo.hoctuthien.com

# ─── Google OAuth ──────────────────────────────────────────────────────────────
# Tạo tại: https://console.cloud.google.com/ → APIs & Services → Credentials
# QUAN TRỌNG: Thêm Authorized redirect URI sau vào Google Console:
#   https://demo.hoctuthien.com/api/auth/callback/google
# (Không có dấu / cuối, phải khớp chính xác với NEXTAUTH_URL)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# ─── App Config ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME=Học Từ Thiện
NEXT_PUBLIC_APP_URL=https://demo.hoctuthien.com

# ─── Thiện Nguyện App ──────────────────────────────────────────────────────────
# Tài khoản nhận tiền (kích hoạt Mentee + học phí) được Admin quản lý hoàn toàn
# qua giao diện: Cài đặt → Tài khoản thiện nguyện → Tạo mới → Đặt làm mặc định.
# KHÔNG cần env var — mọi cấu hình tài khoản đều lưu trong DB (bảng CharityAccount).
#
# Các số tiền (activation, xác thực) cũng do Admin cấu hình qua:
#   Cài đặt → Cấu hình hệ thống → activation_amount / charity_account_verification_amount
# Fallback compile-time: 10,000 VND (activation) và 1,000 VND (xác thực charity).

# ─── Seed ─────────────────────────────────────────────────────────────────────
# Email tài khoản Admin đầu tiên (sẽ được tạo khi chạy `prisma db seed`)
ADMIN_EMAIL=your@gmail.com
# Email tài khoản Mentee demo (tuỳ chọn)
DEMO_MENTEE_EMAIL=mentee@demo.com

# ─── E2E / Playwright (KHÔNG bật trên production thật) ───────────────────────
# Khi = "true": mở route /api/test/generate-token cho Playwright bypass Google OAuth
# Chỉ set trên môi trường staging/CI khi chạy Playwright tests
# E2E_TEST_MODE=true

# ─── Proxy (tuỳ chọn) ─────────────────────────────────────────────────────────
# Nếu server đứng sau corporate proxy, khai báo để Node.js fetch đi qua proxy
# HTTPS_PROXY=http://proxy.example.com:8080
# HTTP_PROXY=http://proxy.example.com:8080

```

### Hướng dẫn tạo Google OAuth Credentials

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **APIs & Services → Credentials**
4. Tạo **OAuth 2.0 Client ID** (loại: Web application)
5. Thêm **Authorized redirect URI**: `http://localhost:3000/api/auth/callback/google`
6. Copy `Client ID` và `Client Secret` vào `.env`

---

## 🧪 Kiểm thử

Dự án có ~**247 test cases** được tổ chức theo 3 tầng:

### Chạy tests

```bash
# Toàn bộ test suite
npm test

# Chỉ Unit Tests (không cần DB, nhanh ~3–5s)
npm run test:unit

# Chỉ Integration Tests (cần Prisma + PostgreSQL, ~10–20s)
npm run test:integration

# E2E Scenario Tests
npm test -- --testPathPattern=e2e

# Xem coverage report
npm run test:coverage
# → Mở file: coverage/index.html

# Watch mode (development)
npm run test:watch

# CI mode
npm run test:ci
```

### Cấu trúc tests

```
src/__tests__/
├── helpers.ts                  ← Builders & mock factories dùng chung
│
├── unit/                       ← Không cần DB, không cần network
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── AuditableEntity.test.ts        (9 tests)
│   │   │   ├── UserEntity.test.ts             (23 tests)
│   │   │   ├── UserEntityEdgeCases.test.ts    (13 tests)
│   │   │   └── DomainEvents.test.ts           (9 tests)
│   │   └── value-objects/
│   │       ├── ValueObjects.test.ts           (21 tests)
│   │       └── Payment.test.ts                (29 tests)
│   └── application/
│       ├── dtos/
│       │   └── UserDTO.test.ts                (9 tests)
│       └── use-cases/
│           ├── UserUseCases.test.ts           (16 tests)
│           ├── PaymentUseCases.test.ts        (14 tests)
│           ├── SessionUseCases.test.ts        (22 tests)
│           ├── MentorUseCases.test.ts         (8 tests)
│           └── ThienNguyenAppClient.test.ts   (12 tests)
│
├── integration/                ← Cần Prisma + PostgreSQL test DB
│   ├── repositories/
│   │   ├── PrismaUserRepository.test.ts       (17 tests)
│   │   ├── PrismaUnitOfWork.test.ts           (7 tests)
│   │   └── PrismaPaymentSessionRepo.test.ts   (21 tests)
│   └── api/
│       └── ApiRoutes.test.ts                  (17 tests)
│
└── e2e/
    └── UserJourney.test.ts                    (9 tests)
                                          ──────────
                                     Total: ~247 tests
```

---

## 🚀 Triển khai

Dự án có thể triển khai lên nhiều nền tảng. Xem [DEPLOY.md](./DEPLOY.md) để biết hướng dẫn chi tiết.

### Nền tảng được hỗ trợ

| Nền tảng | Hướng dẫn |
|----------|-----------|
| **Vercel** | [Xem chi tiết](./DEPLOY.md#1-vercel-khuyến-nghị) |
| **Railway** | [Xem chi tiết](./DEPLOY.md#2-railway) |
| **Render** | [Xem chi tiết](./DEPLOY.md#3-render) |

---

## 🛠️ Công nghệ sử dụng

### Frontend & Framework
| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|---------|
| [Next.js](https://nextjs.org/) | 14.2.5 | React framework với App Router |
| [React](https://react.dev/) | 18 | UI library |
| [TypeScript](https://www.typescriptlang.org/) | 5 | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Utility-first CSS |
| [Radix UI](https://www.radix-ui.com/) | latest | Headless UI components |
| [Lucide React](https://lucide.dev/) | 0.395 | Icon library |
| [next-themes](https://github.com/pacocoursey/next-themes) | 0.3 | Dark/Light mode |
| [Sonner](https://sonner.emilkowal.ski/) | 1.5 | Toast notifications |
| [date-fns](https://date-fns.org/) | 3.6 | Date utilities |

### Backend & Database
| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|---------|
| [Prisma](https://www.prisma.io/) | 5.16 | ORM + Database migrations |
| [PostgreSQL](https://www.postgresql.org/) | >= 14 | Database (development & production) |
| [NextAuth.js v5](https://authjs.dev/) | 5.0.0-beta | Authentication |
| [Zod](https://zod.dev/) | 3.23 | Schema validation |
| [@paralleldrive/cuid2](https://github.com/paralleldrive/cuid2) | 2.2 | ID generation |

### Testing
| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|---------|
| [Jest](https://jestjs.io/) | 29.7 | Test runner |
| [ts-jest](https://kulshekhar.github.io/ts-jest/) | 29.2 | TypeScript support cho Jest |
| [prisma-mock](https://github.com/demonsters/prisma-mock) | 0.13 | Mock Prisma client |
| [MSW](https://mswjs.io/) | 2.3 | Mock Service Worker (API mocking) |
| [Supertest](https://github.com/ladjs/supertest) | 7.0 | HTTP integration testing |

### External Services
| Dịch vụ | Mục đích |
|---------|---------|
| [Google OAuth 2.0](https://developers.google.com/identity) | Xác thực người dùng |
| [Google Meet API](https://developers.google.com/meet) | Tạo link họp trực tuyến |
| [Thiện Nguyện App API](https://thiennguyen.app) | Xác minh giao dịch chuyển khoản |
| [VietQR](https://vietqr.io/) | Tạo QR code thanh toán |

---

## 🔐 Bảo mật & Middleware

File [`src/middleware.ts`](src/middleware.ts) bảo vệ các routes:

- `/dashboard/*` — yêu cầu đăng nhập
- `/dashboard/admin/*` — yêu cầu role `ADMIN`
- `/dashboard/mentor/*` — yêu cầu role `MENTOR` hoặc `ADMIN`
- `/activation` — yêu cầu đăng nhập, chỉ dành cho `PENDING_ACTIVATION`

Session được lưu dưới dạng JWT (strategy: `jwt`) và bao gồm `role`, `status`, `bio`, `phone` của người dùng.

---

## 📊 Domain Model chi tiết

### UserEntity

```typescript
class UserEntity extends AuditableEntity {
  // Properties
  email: Email          // Value Object — validate format
  name: string | null
  image: string | null
  role: UserRole        // ADMIN | MENTOR | MENTEE
  status: UserStatus    // PENDING_ACTIVATION | ACTIVE | INACTIVE | SUSPENDED

  // Methods
  activate()            // PENDING_ACTIVATION → ACTIVE
  deactivate()          // ACTIVE → INACTIVE
  suspend()             // → SUSPENDED
  promoteToMentor()     // MENTEE → MENTOR
  demoteToMentee()      // MENTOR → MENTEE
  updateProfile()       // Cập nhật name, bio, phone
  isMentor()            // boolean
  isAdmin()             // boolean
  isActive()            // boolean
}
```

### AuditableEntity (base class)

Mọi entity đều kế thừa từ `AuditableEntity` với các trường:
- `createdAt`, `createdBy`
- `updatedAt`, `updatedBy`
- `deletedAt`, `deletedBy`, `isDeleted`
- `version` (optimistic locking)

### Payment Value Objects

```typescript
// Mã giao dịch format
"HOCTUTHIEN KICHHOAT ABCDEFGH"  // Kích hoạt tài khoản
"HOCTUTHIEN HOCPHI ABCDEFGH"    // Học phí buổi học

// Chỉ dùng chữ HOA, không dùng số
// (TN App ẩn 3 số liên tiếp thành "xxx")
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // bỏ I, O
```

---

## 💡 Hướng dẫn cho người mới (Onboarding & Troubleshooting)

Nếu bạn là một newbie (Mentee/Fresher) vừa tham gia dự án, đừng lo lắng! Chúng tôi đã chuẩn bị sẵn một tài liệu Onboarding chi tiết dựa trên những kinh nghiệm thực tế.

👉 **[Đọc tài liệu Onboarding tại đây](docs/onboarding.md)**

Trong tài liệu này, bạn sẽ tìm thấy:
- Cách xử lý các lỗi thường gặp khi cài đặt (Node.js version, Prisma DB, Google OAuth).
- Bản đồ source code (Clean Architecture) để biết "đi đâu tìm gì".
- Giải thích các "Magic Code" (Unit of Work, Dependency Injection).
- Hướng dẫn chạy test an toàn trước khi commit.

---

## 🤝 Đóng góp

1. Fork repository
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit changes: `git commit -m 'feat: thêm tính năng X'`
4. Push branch: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

### Quy ước commit message

```
feat:     Tính năng mới
fix:      Sửa lỗi
docs:     Cập nhật tài liệu
style:    Thay đổi format/style (không ảnh hưởng logic)
refactor: Tái cấu trúc code
test:     Thêm/sửa tests
chore:    Cập nhật build tools, dependencies
```

---

## 📄 License

Dự án này được phát triển cho mục đích phi lợi nhuận — **Học Từ Thiện**.

---

<div align="center">
  <p>Made with ❤️ for the Vietnamese learning community</p>
  <p><strong>Học Từ Thiện</strong> — Học để cho đi, cho đi để học</p>
</div>
