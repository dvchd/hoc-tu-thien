# Học Từ Thiện 💚

> Nền tảng kết nối 1-1 Mentor và Mentee. Học phí được chuyển thẳng vào **Quỹ Thiện Nguyện App MBBank**.

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Kiến trúc](#kiến-trúc)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Cài đặt & Chạy](#cài-đặt--chạy)
- [Cấu hình Google OAuth](#cấu-hình-google-oauth)
- [Vai trò người dùng](#vai-trò-người-dùng)
- [API Routes](#api-routes)
- [Design Patterns](#design-patterns)

---

## Tổng quan

**Học Từ Thiện** là một nền tảng EdTech + Thiện nguyện:

- 🎓 Kết nối 1-1 giữa **Mentor** (người hướng dẫn) và **Mentee** (người học)
- 💳 Học phí chuyển khoản **100% trực tiếp** vào Quỹ Thiện Nguyện App MBBank
- 🔐 Đăng nhập **chỉ qua Google OAuth** — không mật khẩu
- 👥 Ba vai trò: **Admin**, **Mentor**, **Mentee** (mặc định khi tạo mới)

---

## Kiến trúc

Dự án áp dụng **Domain-Driven Design (DDD)** kết hợp **Clean Architecture**:

```
┌──────────────────────────────────────────────────────────┐
│                   Presentation Layer                     │
│         (Next.js Pages, React Components, API Routes)    │
├──────────────────────────────────────────────────────────┤
│                   Application Layer                      │
│      (Use Cases, DTOs, Mappers, IUnitOfWork interface)   │
├──────────────────────────────────────────────────────────┤
│                     Domain Layer                         │
│   (Entities, Value Objects, Repository Interfaces,       │
│    Domain Events, Business Rules)                        │
├──────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                     │
│   (Prisma Repositories, Unit of Work, DB Client,         │
│    NextAuth Adapter)                                     │
└──────────────────────────────────────────────────────────┘
```

### Các pattern được sử dụng

| Pattern | Mô tả | File |
|---|---|---|
| **Repository Pattern** | Tách biệt logic data access | `IUserRepository`, `PrismaUserRepository` |
| **Unit of Work** | Đảm bảo tính nguyên tử của transaction | `IUnitOfWork`, `PrismaUnitOfWork` |
| **Audit Entity** | Tự động ghi log createdAt/updatedAt/By | `AuditableEntity` |
| **Versioning** | Optimistic concurrency control | `version` field + `updateMany` check |
| **Soft Delete** | Xoá mềm, giữ dữ liệu | `isDeleted`, `deletedAt`, `deletedBy` |
| **Value Objects** | Email, UserRole, UserStatus | `src/domain/value-objects/` |
| **Domain Events** | Sự kiện trong domain | `DomainEvents.ts` |
| **Use Cases** | Application layer orchestration | `UserUseCases.ts` |
| **DTO + Mapper** | Chuyển đổi qua các layer | `UserDTO.ts`, `UserMapper` |
| **Factory Method** | Tạo entity đúng cách | `UserEntity.create()`, `UserEntity.reconstitute()` |

---

## Cấu trúc thư mục

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/login/             # Login page (Google OAuth)
│   ├── (dashboard)/              # Protected routes
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # Redirect theo role
│   │   │   ├── admin/            # Admin dashboard
│   │   │   ├── mentor/           # Mentor dashboard  
│   │   │   ├── mentee/           # Mentee dashboard
│   │   │   └── settings/         # Profile settings
│   │   └── layout.tsx            # Dashboard layout (Sidebar + TopBar)
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   ├── admin/users/          # Admin user management API
│   │   └── users/profile/        # User profile API
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
│
├── domain/                       # ♻️ Domain Layer (không import infra)
│   ├── entities/
│   │   ├── base/AuditableEntity.ts   # Base entity with audit + soft delete
│   │   └── User.ts                   # User aggregate root
│   ├── value-objects/
│   │   ├── Email.ts
│   │   ├── UserRole.ts
│   │   └── UserStatus.ts
│   ├── repositories/
│   │   └── IUserRepository.ts        # Repository contract (interface)
│   └── events/
│       └── DomainEvents.ts           # Domain events + EventBus
│
├── application/                  # 🎯 Application Layer
│   ├── use-cases/user/
│   │   └── UserUseCases.ts       # FindOrCreate, GetUser, ListUsers, ChangeRole...
│   ├── dtos/
│   │   └── UserDTO.ts            # DTOs + Mapper
│   └── interfaces/
│       └── IUnitOfWork.ts        # UoW contract
│
├── infrastructure/               # 🏗️ Infrastructure Layer
│   ├── database/
│   │   ├── prisma/client.ts      # Prisma singleton
│   │   └── repositories/
│   │       └── PrismaUserRepository.ts
│   └── unit-of-work/
│       └── PrismaUnitOfWork.ts   # Transaction management
│
├── presentation/                 # 🖥️ UI Components
│   └── components/
│       ├── layout/               # Sidebar, TopBar
│       ├── admin/                # AdminStatsCards, AdminUserTable
│       └── settings/             # SettingsForm
│
├── auth.ts                       # NextAuth v5 config
├── middleware.ts                  # Route protection + RBAC
├── lib/
│   ├── container.ts              # Dependency injection
│   └── utils.ts                  # cn(), formatVND()
└── types/
    └── next-auth.d.ts            # Session type augmentation
```

---

## Cài đặt & Chạy

### Yêu cầu
- Node.js >= 18
- npm hoặc pnpm

### Bước 1: Clone & cài đặt

```bash
git clone <repo-url> hoc-tu-thien
cd hoc-tu-thien
npm install
```

### Bước 2: Cấu hình biến môi trường

```bash
cp .env.example .env
```

Cập nhật `.env`:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-32-chars"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Bước 3: Khởi tạo database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Bước 4: Seed dữ liệu (tùy chọn)

```bash
ADMIN_EMAIL=your@gmail.com npm run prisma:seed
```

### Bước 5: Chạy dev server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

---

## Cấu hình Google OAuth

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **APIs & Services → Credentials**
4. Tạo **OAuth 2.0 Client ID** (Web Application)
5. Thêm **Authorized redirect URIs**:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
6. Copy **Client ID** và **Client Secret** vào `.env`

---

## Vai trò người dùng

| Role | Mô tả | Mặc định |
|---|---|---|
| `MENTEE` | Người học. Tìm Mentor, đặt lịch học | ✅ Khi đăng ký |
| `MENTOR` | Người hướng dẫn. Dạy Mentee | Admin thăng cấp |
| `ADMIN` | Quản trị viên. Quản lý toàn bộ hệ thống | Seed hoặc DB |

### Phân quyền route

```
/                     → Public (landing page)
/login                → Public (Google OAuth)
/dashboard            → Auth required → redirect theo role
/dashboard/admin/*    → ADMIN only
/dashboard/mentor/*   → MENTOR + ADMIN
/dashboard/mentee/*   → MENTEE (+ admin xem được)
/dashboard/settings   → Tất cả (đã đăng nhập)
```

---

## API Routes

### Auth
| Method | Route | Mô tả |
|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handler |

### User
| Method | Route | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/users/profile` | Required | Lấy profile hiện tại |
| PATCH | `/api/users/profile` | Required | Cập nhật profile |

### Admin
| Method | Route | Auth | Mô tả |
|---|---|---|---|
| PATCH | `/api/admin/users/role` | ADMIN | Đổi role user |
| DELETE | `/api/admin/users/[id]` | ADMIN | Soft delete user |

---

## Design Patterns chi tiết

### Audit Entity

Mọi entity đều có các trường:
```typescript
createdAt, updatedAt    // Timestamps
createdBy, updatedBy    // Actor IDs
deletedAt, deletedBy    // Soft delete timestamps
isDeleted               // Soft delete flag
version                 // Optimistic locking version
```

### Versioning (Optimistic Concurrency)

```typescript
// Repository update kiểm tra version trước khi ghi
await prisma.user.updateMany({
  where: { id, version: user.version - 1 }, // phải khớp version cũ
  data: { ...updates, version: user.version }, // ghi version mới
});
// Nếu count === 0 → ConcurrencyException
```

### Unit of Work

```typescript
const result = await uow.execute(async (uow) => {
  const user = await uow.users.findById(id);
  const updated = user.promoteToMentor(performedBy);
  await uow.users.update(updated);
  await uow.users.createAuditLog({ ... });
  // Tất cả hoặc không gì cả (transaction)
  return updated;
});
```

### Soft Delete

```typescript
// Không xoá khỏi DB, chỉ đánh dấu
user.softDelete(deletedBy)  // entity method
await uow.users.softDelete(id, deletedBy)  // repository method

// Mọi query mặc định lọc isDeleted = false
findAll({ includeDeleted: false }) // default
```

---

## Công nghệ

- **Framework**: Next.js 14 (App Router)
- **Auth**: NextAuth v5 + Google Provider
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- **Styling**: TailwindCSS + custom design system
- **UI Library**: ShadCN UI (Radix UI primitives)
- **Fonts**: Be Vietnam Pro (body) + Playfair Display (headings)
- **Validation**: Zod
- **Toast**: Sonner

---

## Phát triển tiếp theo

- [ ] Matching algorithm Mentor ↔ Mentee
- [ ] Session booking & calendar integration
- [ ] Payment flow (simulate) → MBBank Quỹ Thiện Nguyện API
- [ ] Video call integration (Jitsi / Daily.co)
- [ ] Rating & review system
- [ ] Email notifications
- [ ] Admin analytics dashboard
- [ ] Mentor profile approval workflow
