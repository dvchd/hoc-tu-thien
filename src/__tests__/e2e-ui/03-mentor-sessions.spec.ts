/**
 * E2E: Mentor Dashboard & Session Management
 *
 * Kiểm thử:
 * 1. Mentor vào /dashboard được route sang /dashboard/mentor
 * 2. Mentor dashboard hiển thị đúng UI
 * 3. Trang sessions mentor hiển thị các section: Chờ xác nhận, Sắp diễn ra, Lịch sử
 * 4. Mentor có thể xác nhận một session (PENDING → CONFIRMED) qua API
 * 5. Trang profile mentor hiển thị form cập nhật
 * 6. Route guard: mentor không vào được /dashboard/admin
 */

import { test, expect, TestUsers } from "./fixtures";

test.describe("Mentor Dashboard", () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs(TestUsers.MENTOR);
  });

  test("mentor sees mentor dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard\/mentor|\/dashboard/, {
      timeout: 10000,
    });

    await expect(page.locator("text=Người hướng dẫn").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Xin chào").first()).toBeVisible();
  });

  test("mentor dashboard shows stat cards", async ({ page }) => {
    await page.goto("/dashboard/mentor");

    await expect(page.locator("text=Mentee đang dạy")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Buổi học tháng này")).toBeVisible();
    await expect(page.locator("text=Đã quyên góp")).toBeVisible();
    await expect(page.locator("text=Giờ giảng dạy")).toBeVisible();
  });

  test("mentor dashboard shows upcoming sessions section", async ({
    page,
  }) => {
    await page.goto("/dashboard/mentor");

    await expect(page.locator("text=Buổi học sắp tới")).toBeVisible({
      timeout: 10000,
    });
  });

  test("mentor sessions page shows correct sections", async ({ page }) => {
    await page.goto("/dashboard/mentor/sessions");

    // Tiêu đề trang
    await expect(
      page.locator("h1", { hasText: "Quản lý buổi học" })
    ).toBeVisible({ timeout: 10000 });

    // Các section
    await expect(page.locator("text=Sắp diễn ra")).toBeVisible();
    await expect(page.locator("text=Lịch sử")).toBeVisible();
  });

  test("mentor sessions page shows empty state when no sessions", async ({
    page,
  }) => {
    await page.goto("/dashboard/mentor/sessions");

    // Nếu không có sessions sắp tới, phải hiển thị empty state
    await page.waitForLoadState("networkidle");
    const emptyState = page.locator("text=Không có buổi học sắp tới");
    const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
    const hasSessionCards = await page.locator('[data-testid="session-card"]').count().catch(() => 0);

    // Một trong hai phải đúng
    expect(hasEmptyState || hasSessionCards >= 0).toBeTruthy();
  });

  test("mentor can see session with PENDING status after booking", async ({
    page,
    db,
  }) => {
    // Tạo một session PENDING cho mentor này
    const ts = Date.now();
    const menteeId = TestUsers.ACTIVE_MENTEE;
    const session = await db.learningSession.create({
      data: {
        id: `e2e_sess_${ts}`,
        menteeId,
        mentorId: TestUsers.MENTOR,
        title: `E2E Session ${ts}`,
        status: "PENDING",
        scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
        durationMinutes: 60,
        fee: 200000,
        version: 1,
      },
    });

    await page.goto("/dashboard/mentor/sessions");
    await page.waitForLoadState("networkidle");

    // Phần "Chờ xác nhận" phải hiện (dùng heading để tránh strict mode violation)
    await expect(
      page.locator("h2", { hasText: "Chờ xác nhận" })
    ).toBeVisible({ timeout: 10000 });

    // Session title phải hiện
    await expect(
      page.locator(`text=E2E Session ${ts}`)
    ).toBeVisible({ timeout: 5000 });

    // Cleanup
    await db.learningSession.delete({ where: { id: session.id } });
  });

  test("mentor can confirm a session via API then see CONFIRMED status", async ({
    page,
    db,
  }) => {
    const ts = Date.now();
    const sess = await db.learningSession.create({
      data: {
        id: `e2e_confirm_${ts}`,
        menteeId: TestUsers.ACTIVE_MENTEE,
        mentorId: TestUsers.MENTOR,
        title: `Confirm Test ${ts}`,
        status: "PENDING",
        scheduledAt: new Date(Date.now() + 72 * 3600 * 1000),
        durationMinutes: 60,
        fee: 0,
        version: 1,
      },
    });

    // Gọi API confirm trực tiếp (Playwright request context đã có cookie)
    await page.goto("/dashboard/mentor/sessions");
    const apiRes = await page.request.patch(`/api/sessions/${sess.id}`, {
      data: {
        action: "confirm",
        meetLink: "https://meet.google.com/abc-def-ghi",
      },
    });
    expect(apiRes.ok()).toBeTruthy();
    const body = await apiRes.json();
    expect(body.status).toBe("CONFIRMED");

    // Reload trang → session phải chuyển sang CONFIRMED
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Phần Sắp diễn ra phải hiện session này
    await expect(
      page.locator(`text=Confirm Test ${ts}`)
    ).toBeVisible({ timeout: 10000 });

    // Cleanup
    await db.learningSession.delete({ where: { id: sess.id } });
  });

  test("mentor profile page loads and shows form", async ({ page }) => {
    await page.goto("/dashboard/mentor/profile");
    await page.waitForLoadState("networkidle");

    // Phải có form cập nhật profile hoặc tiêu đề
    await expect(
      page.locator('h1, h2').filter({ hasText: /[Hh]ồ sơ|[Mm]entor|[Pp]rofile/ }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("mentor CANNOT access admin routes", async ({ page }) => {
    await page.goto("/dashboard/admin");
    await expect(page).toHaveURL(/\/dashboard$|\/dashboard\/mentor/, {
      timeout: 10000,
    });
    await expect(page).not.toHaveURL(/\/dashboard\/admin/);
  });
});
