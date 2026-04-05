import { createId } from "@paralleldrive/cuid2";
import { IUnitOfWork } from "../../interfaces/IUnitOfWork";

// ─── DTO ──────────────────────────────────────────────────────────────────────

export interface AvailabilitySlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface SetAvailabilitySlotsDTO {
  userId: string;
  slots: AvailabilitySlotInput[];
}

// ─── Validation ────────────────────────────────────────────────────────────────

const DAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isOverlapping(
  aStart: string, aEnd: string, bStart: string, bEnd: string
): boolean {
  const as = toMinutes(aStart), ae = toMinutes(aEnd);
  const bs = toMinutes(bStart), be = toMinutes(bEnd);
  return as < be && bs < ae;
}

function validateSlots(slots: AvailabilitySlotInput[]): string | null {
  if (slots.length > 20) {
    return "Tối đa 20 khung giờ mỗi tuần.";
  }

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const startMin = toMinutes(s.startTime);
    const endMin = toMinutes(s.endTime);

    if (startMin >= endMin) {
      return `Khung giờ #${i + 1} (${DAYS[s.dayOfWeek]}): Giờ bắt đầu phải trước giờ kết thúc.`;
    }
    if (endMin - startMin < 30) {
      return `Khung giờ #${i + 1} (${DAYS[s.dayOfWeek]}): Mỗi khung giờ phải ít nhất 30 phút.`;
    }
    if (startMin < 7 * 60 || endMin > 21 * 60) {
      return `Khung giờ #${i + 1} (${DAYS[s.dayOfWeek]}): Giờ phải trong khoảng 07:00 – 21:00.`;
    }
  }

  // Check overlap between slots on the same day
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i], b = slots[j];
      if (a.dayOfWeek === b.dayOfWeek && isOverlapping(a.startTime, a.endTime, b.startTime, b.endTime)) {
        return `${DAYS[a.dayOfWeek]}: Khung giờ ${a.startTime}–${a.endTime} và ${b.startTime}–${b.endTime} bị trùng nhau.`;
      }
    }
  }

  return null;
}

// ─── UseCase ───────────────────────────────────────────────────────────────────

export class SetAvailabilitySlotsUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(input: SetAvailabilitySlotsDTO): Promise<void> {
    return this.uow.execute(async (uow) => {
      // Validate user
      const user = await uow.users.findById(input.userId);
      if (!user) throw new Error("Không tìm thấy người dùng");
      if (!user.isMentor() && !user.isAdmin()) {
        throw new Error("Chỉ Mentor mới có thể cập nhật lịch trống");
      }

      // Validate slots
      const validationError = validateSlots(input.slots);
      if (validationError) throw new Error(validationError);

      // Get profile
      const profile = await uow.mentorProfiles.findByUserId(input.userId);
      if (!profile) throw new Error("Mentor chưa thiết lập hồ sơ");

      // Replace all slots atomically (within UoW transaction)
      const slotsWithIds = input.slots.map((s) => ({
        id: createId(),
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isRecurring: true,
      }));
      await uow.mentorProfiles.replaceAvailabilitySlots(profile.id, slotsWithIds);

      await uow.users.createAuditLog({
        userId: input.userId,
        action: "MENTOR_AVAILABILITY_UPDATED",
        newValues: { slotCount: slotsWithIds.length, profileId: profile.id },
        performedBy: input.userId,
      });
    });
  }
}
