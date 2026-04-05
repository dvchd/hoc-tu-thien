// ─── Google Meet Service ──────────────────────────────────────────────────────
// Tạo Google Meet link cho buổi học
// Trong production: dùng Google Calendar API với conference data
// Hiện tại: dùng meet.google.com/new redirect pattern (không cần auth)

export interface MeetLinkResult {
  meetLink: string;
  meetId: string;
}

/**
 * Sinh ra một Meet ID ngẫu nhiên theo format xxx-yyyy-zzz
 */
function generateMeetId(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz"; // bỏ o, l tránh nhầm
  const segment = (len: number) =>
    Array.from({ length: len }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

  return `${segment(3)}-${segment(4)}-${segment(3)}`;
}

export class GoogleMeetService {
  /**
   * Tạo Google Meet link cho buổi học
   *
   * Production: Integrate với Google Calendar API
   *   POST https://www.googleapis.com/calendar/v3/calendars/primary/events
   *   với conferenceDataVersion=1 và conferenceData.createRequest
   *
   * Current: Generate link pattern, user vào link sẽ tạo meeting mới
   */
  async createMeetLink(_sessionId: string): Promise<MeetLinkResult> {
    const meetId = generateMeetId();
    const meetLink = `https://meet.google.com/${meetId}`;

    // TODO: Khi tích hợp Google Calendar API:
    // 1. Tạo Calendar Event với thời gian session
    // 2. Thêm attendees (mentor email + mentee email)
    // 3. Request conference data
    // 4. Return conferenceData.entryPoints[0].uri

    return { meetLink, meetId };
  }
}

export const meetService = new GoogleMeetService();
