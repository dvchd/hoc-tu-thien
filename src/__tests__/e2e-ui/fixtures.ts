import { test as base, expect, Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

export { expect } from "@playwright/test";

const prisma = new PrismaClient();

export type TestUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
};

/**
 * Custom fixtures cho E2E tests:
 * - db: PrismaClient trực tiếp để verify DB state
 * - loginAs(userId): set JWT session cookie, bypass Google OAuth
 */
export const test = base.extend<{
  db: PrismaClient;
  loginAs: (userId: string) => Promise<void>;
  waitForPage: (url: string) => Promise<void>;
}>({
  db: async ({}, use) => {
    await use(prisma);
    // Không disconnect ở đây — dùng chung instance xuyên suốt test file
  },

  loginAs: async ({ page, baseURL }, use) => {
    await use(async (userId: string) => {
      // Gọi API test để lấy JWT token
      const res = await page.request.post(`${baseURL}/api/test/generate-token`, {
        data: { userId },
      });

      if (!res.ok()) {
        const body = await res.text();
        throw new Error(`generate-token failed for ${userId}: ${res.status()} — ${body}`);
      }

      const { token } = await res.json();

      // next-auth v5 (@auth/core) dùng cookie "authjs.session-token"
      await page.context().addCookies([
        {
          name: "authjs.session-token",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ]);
    });
  },

  waitForPage: async ({ page }, use) => {
    await use(async (url: string) => {
      await page.waitForURL(`**${url}**`, { timeout: 15000 });
    });
  },
});

/**
 * Các test user IDs được seed trong global-setup.ts.
 * Import từ đây để không bị hardcode rải rác.
 */
export const TestUsers = {
  PENDING_MENTEE: "e2e_pending_mentee",
  ACTIVE_MENTEE: "e2e_active_mentee",
  MENTOR: "e2e_mentor",
  ADMIN: "e2e_admin",
  APPLY_MENTEE: "e2e_apply_mentee",
} as const;
