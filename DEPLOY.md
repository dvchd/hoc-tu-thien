# Hướng dẫn Triển khai (Deployment Guide)

## Các nền tảng được hỗ trợ

### 1. Vercel (Khuyến nghị)

**Ưu điểm:**
- Miễn phí cho hobby tier
- Tích hợp sẵn với Next.js
- Deploy tự động từ GitHub

**Các bước:**

1. **Push code lên GitHub** (đã làm)

2. **Tạo tài khoản Vercel:**
   - Truy cập https://vercel.com
   - Sign in với GitHub

3. **Import dự án:**
   - Click "Add New..." → "Project"
   - Chọn repository `hoc-tu-thien`

4. **Cấu hình Environment Variables:**
   ```
   DATABASE_PROVIDER=postgresql
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/hoc_tu_thien
   
   AUTH_SECRET=your_generated_secret
   NEXTAUTH_SECRET=your_generated_secret
   NEXTAUTH_URL=https://your-app.vercel.app
   
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   NEXT_PUBLIC_APP_NAME=Học Từ Thiện
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   
   ADMIN_EMAIL=your_admin_email@gmail.com
   ```

5. **Deploy:**
   - Click "Deploy"
   - Đợi build hoàn tất (~2-3 phút)

---

### 2. Railway

**Ưu điểm:**
- Hỗ trợ PostgreSQL tích hợp
- Deploy tự động
- Tier miễn phí tốt

**Các bước:**

1. **Tạo tài khoản:**
   - Truy cập https://railway.app
   - Sign in với GitHub

2. **Tạo dự án mới:**
   - Click "New Project"
   - Chọn "Deploy from GitHub repo"
   - Chọn repository

3. **Thêm PostgreSQL:**
   - Click "New" → "Database" → "PostgreSQL"
   - Copy connection string

4. **Cấu hình Environment Variables:**
   - Vào mục "Variables"
   - Thêm tất cả variables như trên
   -特别注意: `DATABASE_URL` dùng connection string từ Railway

5. **Deploy:**
   - Railway tự động deploy khi push lên main branch

---

### 3. Render

**Ưu điểm:**
- Miễn phí tier cho web service
- PostgreSQL miễn phí

**Các bước:**

1. **Tạo tài khoản:**
   - Truy cập https://render.com
   - Sign in với GitHub

2. **Tạo PostgreSQL:**
   - New → PostgreSQL
   - Copy internal connection string

3. **Tạo Web Service:**
   - New → Web Service
   - Connect repository
   - Cấu hình:
     - Build Command: `npm run build`
     - Start Command: `npm start`
   - Thêm Environment Variables

---

## Cấu hình sau khi Deploy

### 1. Google OAuth

1. Truy cập [Google Cloud Console](https://console.cloud.google.com)
2. Chọn project → APIs & Services → Credentials
3. Thêm **Authorized redirect URIs**:
   ```
   https://your-domain.com/api/auth/callback/google
   ```
4. Cập nhật `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`

### 2. Khởi tạo Database

Sau khi deploy, chạy các lệnh sau (thông qua Railway/Render console hoặc remote):

```bash
# Tạo bảng
npx prisma db push

# Seed dữ liệu mẫu
npm run prisma:seed
```

### 3. Cấu hình ban đầu

1. **Đăng nhập bằng Google** với email admin
2. **Vào Admin Dashboard** → System Config
3. Cấu hình:
   - `activation_amount`: 10000
   - `min_booking_advance_hours`: 1
   - `late_cancel_threshold_minutes`: 30
   - `payment_expiry_hours`: 24

4. **Tạo Charity Account** (Admin → TK Thiện nguyện):
   - Thêm tài khoản nhận tiền
   - Đặt làm default

---

## Kiểm tra sau Deploy

1. ✅ Đăng nhập Google OAuth
2. ✅ Kích hoạt tài khoản (chuyển khoản test)
3. ✅ Xem danh sách Mentor
4. ✅ Đặt lịch học (test)
5. ✅ Admin duyệt Mentor application

---

## Troubleshooting

### Lỗi "redirect_uri_mismatch"
- Kiểm tra Google OAuth Authorized redirect URIs khớp chính xác với NEXTAUTH_URL

### Lỗi Database connection
- Kiểm tra DATABASE_URL đúng format
- Kiểm tra PostgreSQL đang chạy

### Lỗi "Session not found"
- Thử đăng nhập lại
- Xóa cookies

---

## Production Checklist

- [ ] Sử dụng domain thực (không localhost)
- [ ] Bật HTTPS
- [ ] Cấu hình NEXTAUTH_URL đúng domain
- [ ] Cập nhật Google OAuth redirect URIs
- [ ] Database có dữ liệu seed
- [ ] Admin account đã tạo
- [ ] Test toàn bộ user flows
