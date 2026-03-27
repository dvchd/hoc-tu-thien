import { test, expect } from './fixtures';
import { Page } from '@playwright/test';

test.describe('Mentee Booking Flow', () => {
  let menteeEmail: string;
  let mentorEmail: string;

  test.beforeAll(async () => {
    menteeEmail = `mentee_e2e_${Date.now()}@example.com`;
    mentorEmail = `mentor_e2e_${Date.now()}@example.com`;
  });

  test('should display dashboard when active', async ({ page, loginAs, db }) => {
    // 1. Tạo user chưa kích hoạt
    const user = await db.user.create({
      data: {
        id: `test_${Date.now()}`,
        email: menteeEmail,
        name: 'Test Mentee',
        role: 'MENTEE',
        status: 'PENDING_ACTIVATION',
        version: 1
      }
    });

    // 2. Login
    await loginAs(menteeEmail);

    // 3. Truy cập trang chủ - nên bị redirect sang activation
    await page.goto('/dashboard');
    
    // Test: Xem có chữ "Kích hoạt tài khoản" không (bắt buột chuyển qua trang Activation vì tài khoản PENDING_ACTIVATION)
    await expect(page.locator('h1', { hasText: 'Kích hoạt tài khoản' })).toBeVisible({ timeout: 10000 });
  });

  test('should display dashboard when active mentee', async ({ page, loginAs, db }) => {
    const activeEmail = `active_${menteeEmail}`;
    // 1. Tạo user đã kích hoạt
    await db.user.create({
      data: {
        id: `test_active_${Date.now()}`,
        email: activeEmail,
        name: 'Active Mentee',
        role: 'MENTEE',
        status: 'ACTIVE',
        version: 1
      }
    });

    // 2. Login
    await loginAs(activeEmail);
    await page.goto('/dashboard');
    
    // Test: xem có vào được Mentee dashboard không
    await expect(page.locator('text=Người học').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Xin chào').first()).toBeVisible();
    await expect(page.locator('text=Tìm Mentor phù hợp')).toBeVisible();
  });
});
