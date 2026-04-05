# 🚀 Tài liệu Onboarding dành cho Newbie (Mentee/Fresher)

Chào mừng bạn gia nhập dự án **Học Từ Thiện**! Tài liệu này được đúc kết từ trải nghiệm thực tế của những người mới (newbie) khi mới bước chân vào dự án, nhằm giúp bạn làm quen với source code và quy trình làm việc một cách nhanh chóng và ít "đau đớn" nhất.

---

## 1. Setup môi trường & Các lỗi thường gặp (Troubleshooting)

### 1.1 Lỗi Node.js version
**Triệu chứng:** Khi chạy `npm install` báo lỗi không tương thích phiên bản của một số packages (như Next.js 14, Prisma).
**Cách fix:** 
- Đảm bảo bạn đang dùng **Node.js >= 18.17.0**. Khuyến nghị sử dụng `nvm` (Node Version Manager) để quản lý phiên bản:
  ```bash
  nvm install 18
  nvm use 18
  ```

### 1.2 Lỗi Prisma "Authentication failed" hoặc "Connection refused"
**Triệu chứng:** Khi chạy `npx prisma db push` bị văng lỗi không kết nối được database.
**Cách fix:**
- Kiểm tra lại biến `DATABASE_URL` trong file `.env`. Đảm bảo PostgreSQL server của bạn đang chạy.
- Nếu dùng Docker cho DB local:
  ```bash
  docker run --name hoc-tu-thien-db -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=hoc_tu_thien -p 5432:5432 -d postgres:14
  ```
  Lúc này `DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/hoc_tu_thien"`

### 1.3 Lỗi NextAuth Google Login không hoạt động
**Triệu chứng:** Click đăng nhập Google ở localhost thì bị báo lỗi "Error 400: redirect_uri_mismatch".
**Cách fix:**
- Vào Google Cloud Console.
- Trong phần Credentials > OAuth 2.0 Client IDs, kiểm tra **Authorized redirect URIs**.
- Phải chắc chắn có chứa link này: `http://localhost:3000/api/auth/callback/google`

---

## 2. Bản đồ Source Code (Đi đâu tìm gì?)

Dự án dùng kiến trúc **Clean Architecture** kết hợp **Domain-Driven Design (DDD)**. Nếu bạn chưa quen, đừng hoảng, hãy nhớ nguyên tắc này: **Dependency đi từ ngoài vào trong**.

*   🔴 **`src/domain/` (Core nhất, không phụ thuộc vào ai)**:
    *   Chứa các Entities (như `User`, `LearningSession`).
    *   Định nghĩa Interface (hợp đồng) cho Repositories. Bạn muốn biết Database cần cung cấp những hàm gì? Hãy vào `domain/repositories`.
*   🟡 **`src/application/` (Nơi chứa Business Logic)**:
    *   Đây là chỗ bạn nên đọc ĐẦU TIÊN khi muốn hiểu 1 tính năng.
    *   Các **Use Cases** (như `BookSessionUseCase`, `ApproveMentorApplicationUseCase`) nằm ở đây. Nó định nghĩa các bước logic: Validate -> Lưu DB -> Bắn Event.
*   🟢 **`src/infrastructure/` (Tương tác với thế giới bên ngoài)**:
    *   Implement thực tế của Repositories (Dùng Prisma để gọi PostgreSQL).
    *   Gọi API bên thứ 3 (như `ThienNguyenAppClient`, `GoogleMeetService`).
*   🔵 **`src/presentation/` & `src/app/` (Giao diện và API)**:
    *   Nơi định nghĩa React Components, Next.js Pages và API Routes. UI gọi API, API gọi Application Layer (Use Cases).

---

## 3. "Magic Code" & Điểm cần lưu ý

### 3.1 Prisma Unit of Work (`PrismaUnitOfWork`)
Trong các Use Cases, bạn sẽ thấy người ta gọi `uow.users.findById(...)` thay vì gọi thẳng `prisma.user.findUnique`. 
*   **Tại sao?** Đây là pattern **Unit of Work**. Nó đảm bảo nếu 1 tính năng cần update nhiều bảng (ví dụ: tạo Session VÀ cập nhật số dư), nếu 1 bước lỗi thì tất cả sẽ rollback lại (Transaction). 
*   **Nằm ở đâu:** `src/infrastructure/unit-of-work/PrismaUnitOfWork.ts`.

### 3.2 Dependency Injection (`src/lib/container.ts`)
Thay vì `new BookSessionUseCase()` ở mọi file API, team mình tạo sẵn các instance của Use Cases trong file `container.ts` và export ra. 
*   Khi viết API mới, chỉ cần `import { createUseCases } from '@/lib/container';` là lấy ra xài được luôn.

### 3.3 Auth Middleware (`src/middleware.ts`)
Nếu bạn tạo 1 page mới trong `/dashboard/admin/` nhưng vào bị redirect ra ngoài? 
*   Đó là do `middleware.ts` đang chặn lại, nó check session cookie xem role của bạn có phải là `ADMIN` không. Hãy đọc file này để hiểu cách phân quyền các thư mục.

---

## 4. Hướng dẫn Test để không làm "Break" hệ thống

Khi bạn sửa code, hãy làm theo quy trình sau để chắc chắn mình không tạo ra bug:

1. **Chạy Linter:**
   ```bash
   npm run lint
   # Nếu có lỗi format, chạy thử bash ./fix-lint.sh
   ```
2. **Chạy Unit Test (Rất nhanh, nên chạy thường xuyên):**
   ```bash
   npm run test:unit
   ```
   *Lưu ý: Unit test không đụng vào Database thật, nó dùng Mock.*
3. **Chạy Integration Test (Kiểm tra xem câu lệnh Prisma có đúng không):**
   ```bash
   npm run test:integration
   ```
4. **Kiểm tra kiểu dữ liệu (TypeScript):**
   ```bash
   npx tsc --noEmit
   ```

## 5. Bắt đầu với Task đầu tiên của bạn

Nếu bạn mới vào, hãy xin Mentor giao cho 1 task ở cấp độ Presentation hoặc API đơn giản để quen tay:
1. Thêm 1 API route GET thông tin hiển thị lên UI.
2. Fix 1 bug giao diện (Tailwind CSS) ở thư mục `src/presentation/components`.
3. Viết thêm 1 Unit test cho 1 Value Object trong `src/domain/value-objects/`.

Chúc bạn có những giờ phút code vui vẻ và học hỏi được nhiều điều tại dự án! 🚀
