import { test as base } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mở rộng custom fixture: mỗi test có database client để kiểm tra hoặc setup dữ liệu trực tiếp
export const test = base.extend<{
  db: PrismaClient;
  loginAs: (email: string) => Promise<void>;
}>({
  db: async ({}, use) => {
    await use(prisma);
  },
  loginAs: async ({ page, request }, use) => {
    await use(async (email: string) => {
      // Dùng auth-token API để lấy JWT cookie
      const res = await request.post('/api/test/generate-token', {
        data: { email }
      });
      const data = await res.json();
      
      const isSecure = page.url().startsWith('https');
      const cookieName = isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
      
      await page.context().addCookies([{
        name: cookieName,
        value: data.token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: isSecure,
        sameSite: 'Lax'
      }]);
    });
  }
});
export { expect } from '@playwright/test';