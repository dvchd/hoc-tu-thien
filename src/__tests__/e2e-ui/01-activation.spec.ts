/**
 * E2E: Activation Flow
 *
 * Kiểm thử luồng kích hoạt tài khoản:
 * 1. User PENDING_ACTIVATION bị redirect sang /activation
 * 2. Trang activation hiển thị QR code và thông tin chuyển khoản
 * 3. User ACTIVE vào /activation bị redirect sang /dashboard
 * 4. Trang đăng nhập hiển thị đúng khi chưa login
 */

import { test, expect, TestUsers } from "./fixtures";

test.describe("Activation Flow", () => {
  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.locator("text=Chào mừng!").first()).toBeVisible();
  });

  test("PENDING_ACTIVATION user is redirected to /activation", async ({
    page,
    loginAs,
  }) => {
    await loginAs(TestUsers.PENDING_MENTEE);
    await page.goto("/dashboard");

    // Middleware sẽ redirect về /activation
    await expect(page).toHaveURL(/\/activation/, { timeout: 10000 });

    // Kiểm tra nội dung trang activation
    await expect(
      page.locator("h1", { hasText: "Kích hoạt tài khoản" })
    ).toBeVisible();
    await expect(page.locator("text=10.000₫")).toBeVisible();
    await expect(page.locator("text=Quỹ Thiện Nguyện MBBank").first()).toBeVisible();
  });

  test("activation page shows QR code and payment instructions", async ({
    page,
    loginAs,
  }) => {
    await loginAs(TestUsers.PENDING_MENTEE);
    await page.goto("/activation");

    // Các phần tử chính cần hiển thị
    await expect(
      page.locator("h1", { hasText: "Kích hoạt tài khoản" })
    ).toBeVisible({ timeout: 10000 });

    // Phải có nút "Tôi đã chuyển khoản" hoặc "Xác nhận"
    const verifyBtn = page.locator(
      'button:has-text("Tôi đã chuyển khoản"), button:has-text("Xác nhận")'
    );
    await expect(verifyBtn).toBeVisible();

    // Phải có 3 benefit boxes
    await expect(page.locator("text=Chống tài khoản rác")).toBeVisible();
    await expect(page.locator("text=Ý nghĩa thiện nguyện")).toBeVisible();
    await expect(page.locator("text=Một lần duy nhất")).toBeVisible();
  });

  test("ACTIVE user accessing /activation is redirected to /dashboard", async ({
    page,
    loginAs,
  }) => {
    await loginAs(TestUsers.ACTIVE_MENTEE);
    await page.goto("/activation");

    // Active user không cần kích hoạt → redirect về dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("PENDING_ACTIVATION user cannot access /dashboard/mentee directly", async ({
    page,
    loginAs,
  }) => {
    await loginAs(TestUsers.PENDING_MENTEE);
    await page.goto("/dashboard/mentee");

    // Middleware redirect về /activation
    await expect(page).toHaveURL(/\/activation/, { timeout: 10000 });
  });
});
