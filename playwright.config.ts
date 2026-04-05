import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Playwright E2E UI Test Configuration
 *
 * - Tự động khởi động Next.js dev server
 * - global-setup: seed test users vào DB một lần
 * - global-teardown: dọn dẹp toàn bộ test data
 * - Chạy tuần tự (workers: 1) để tránh race condition trên DB dùng chung
 */
export default defineConfig({
  testDir: path.join(__dirname, "src/__tests__/e2e-ui"),
  testMatch: "**/*.spec.ts",

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  reporter: process.env.CI
    ? "github"
    : [["list"], ["html", { open: "never" }]],

  globalSetup: path.join(
    __dirname,
    "src/__tests__/e2e-ui/global-setup.ts"
  ),
  globalTeardown: path.join(
    __dirname,
    "src/__tests__/e2e-ui/global-teardown.ts"
  ),

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Dùng executable path của Playwright image v1.43.0
        launchOptions: {
          executablePath: "/ms-playwright/chromium-1112/chrome-linux/chrome",
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      },
    },
  ],

  webServer: {
    command: "E2E_TEST_MODE=true NEXTAUTH_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120 * 1000,
    env: {
      E2E_TEST_MODE: "true",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
  },
});
