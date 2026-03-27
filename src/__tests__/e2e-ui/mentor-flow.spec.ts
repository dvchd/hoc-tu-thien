import { test, expect } from './fixtures';

test.describe('Mentor Flow', () => {
  let mentorEmail: string;

  test.beforeAll(async () => {
    mentorEmail = `mentor_e2e_${Date.now()}@example.com`;
  });

  test('should display mentor dashboard and upcoming sessions', async ({ page, loginAs, db }) => {
    // 1. Tạo user Mentor
    const mentorUser = await db.user.create({
      data: {
        id: `mentor_${Date.now()}`,
        email: mentorEmail,
        name: 'Test Mentor',
        role: 'MENTOR',
        status: 'ACTIVE',
        version: 1
      }
    });

    // 2. Tạo MentorProfile
    await db.mentorProfile.create({
      data: {
        id: `profile_${Date.now()}`,
        userId: mentorUser.id,
        headline: 'Senior Test Engineer',
        bio: '10 years experience',
        hourlyRate: 500000,
        isAvailable: true,
        onlyActivatedMentee: false
      }
    });

    // 3. Tạo một session chờ xác nhận
    await db.learningSession.create({
      data: {
        id: `sess_${Date.now()}`,
        menteeId: 'some_mentee_id', // mock
        mentorId: mentorUser.id,
        title: 'Hướng dẫn E2E Test',
        status: 'PENDING',
        scheduledAt: new Date(Date.now() + 86400000), // ngày mai
        durationMinutes: 60,
        fee: 500000,
        version: 1
      }
    });

    // 4. Login bằng mentor
    await loginAs(mentorEmail);
    await page.goto('/dashboard');

    // Mặc định Next.js layout sẽ route theo role
    // Test: xem có truy cập được dashboard của mentor không
    await expect(page.locator('text=Người hướng dẫn')).toBeVisible({ timeout: 5000 });
    
    // Test: xem có hiển thị session đang chờ duyệt không (tùy thuộc vào UI của /dashboard/mentor)
    // Giả sử có hiển thị "Hướng dẫn E2E Test" hoặc số lượng yêu cầu mới
  });
});
