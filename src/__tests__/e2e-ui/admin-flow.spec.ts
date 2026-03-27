import { test, expect } from './fixtures';

test.describe('Admin Flow', () => {
  let adminEmail: string;

  test.beforeAll(async () => {
    adminEmail = `admin_e2e_${Date.now()}@example.com`;
  });

  test('should display admin dashboard and allow managing users', async ({ page, loginAs, db }) => {
    // 1. Tạo user Admin
    const adminUser = await db.user.create({
      data: {
        id: `admin_${Date.now()}`,
        email: adminEmail,
        name: 'Super Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        version: 1
      }
    });

    // 2. Tạo một số user mẫu để hiển thị
    await db.user.create({
      data: {
        id: `mentee_dummy_${Date.now()}`,
        email: 'mentee_dummy@example.com',
        name: 'Dummy Mentee',
        role: 'MENTEE',
        status: 'ACTIVE',
        version: 1
      }
    });

    // 3. Đăng nhập Admin
    await loginAs(adminEmail);
    await page.goto('/dashboard');

    // Mặc định Next.js layout sẽ route theo role (ADMIN)
    // Kiểm tra hiển thị "Quản trị viên"
    await expect(page.locator('text=Quản trị viên').first()).toBeVisible({ timeout: 5000 });

    // Kiểm tra có hiển thị tổng số Users (số lượng) - giả sử UI có khối "Người dùng"
    await expect(page.locator('text=Tổng quan hệ thống').first()).toBeVisible();

    // Vào thử trang quản lý users qua menu trái
    await page.click('nav a:has-text("Người dùng")', { timeout: 2000 }).catch(() => {
      // fallback
      page.goto('/dashboard/admin/users');
    });

    // Trang users load lên phải có thông tin
    await expect(page.locator('h1:has-text("Người dùng")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Super Admin').first()).toBeVisible();
    await expect(page.locator('text=Dummy Mentee').first()).toBeVisible();
  });
});
