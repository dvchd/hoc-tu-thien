import { SetAvailabilitySlotsUseCase } from "@/application/use-cases/mentor/SetAvailabilitySlotsUseCase";
import { createMockUnitOfWork, buildMentor, buildMentee } from "@/__tests__/helpers";

// ─── SetAvailabilitySlotsUseCase ──────────────────────────────────────────────

describe("SetAvailabilitySlotsUseCase", () => {
  let useCase: SetAvailabilitySlotsUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;

  const mockProfile = {
    id: "profile-1",
    userId: "mentor_001",
    bio: null,
    experience: null,
    headline: "Senior Dev",
    hourlyRate: 50000,
    charityAccountId: null,
    onlyActivatedMentee: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { name: "Mentor A", email: "mentor@example.com", image: null },
    teachingFields: [],
    availabilitySlots: [],
    totalSessions: 0,
    averageRating: null,
    ratingCount: 0,
  };

  const validSlots = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
    { dayOfWeek: 3, startTime: "14:00", endTime: "16:00" },
  ];

  function setupHappyPath() {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(mockProfile);
  }

  beforeEach(() => {
    uow = createMockUnitOfWork();
    useCase = new SetAvailabilitySlotsUseCase(uow);
  });

  // 1. Happy path
  it("should set availability slots successfully", async () => {
    setupHappyPath();

    await useCase.execute({ userId: "mentor_001", slots: validSlots });

    expect(uow.mentorProfiles.replaceAvailabilitySlots).toHaveBeenCalledWith(
      "profile-1",
      expect.arrayContaining([
        expect.objectContaining({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "11:00",
          isRecurring: true,
        }),
        expect.objectContaining({
          dayOfWeek: 3,
          startTime: "14:00",
          endTime: "16:00",
          isRecurring: true,
        }),
      ])
    );
    expect(uow.mentorProfiles.replaceAvailabilitySlots).toHaveBeenCalledTimes(1);
  });

  // 2. User not found
  it("should throw error when user not found", async () => {
    uow.users.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: "unknown", slots: validSlots })
    ).rejects.toThrow("Không tìm thấy người dùng");

    expect(uow.mentorProfiles.replaceAvailabilitySlots).not.toHaveBeenCalled();
  });

  // 3. Non-mentor user
  it("should throw error when non-mentor tries to set slots", async () => {
    uow.users.findById.mockResolvedValue(buildMentee());

    await expect(
      useCase.execute({ userId: "mentee_001", slots: validSlots })
    ).rejects.toThrow("Chỉ Mentor mới có thể cập nhật lịch trống");

    expect(uow.mentorProfiles.replaceAvailabilitySlots).not.toHaveBeenCalled();
  });

  // 4. Profile not found
  it("should throw error when mentor has no profile", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: "mentor_001", slots: validSlots })
    ).rejects.toThrow("Mentor chưa thiết lập hồ sơ");

    expect(uow.mentorProfiles.replaceAvailabilitySlots).not.toHaveBeenCalled();
  });

  // 5. Validation: max 20 slots
  it("should throw error when more than 20 slots", async () => {
    setupHappyPath();
    const tooManySlots = Array.from({ length: 21 }, (_, i) => ({
      dayOfWeek: i % 7,
      startTime: "09:00",
      endTime: "10:00",
    }));

    await expect(
      useCase.execute({ userId: "mentor_001", slots: tooManySlots })
    ).rejects.toThrow("Tối đa 20 khung giờ mỗi tuần");

    expect(uow.mentorProfiles.replaceAvailabilitySlots).not.toHaveBeenCalled();
  });

  // 6. Validation: startTime >= endTime
  it("should throw error when startTime >= endTime", async () => {
    setupHappyPath();

    await expect(
      useCase.execute({
        userId: "mentor_001",
        slots: [{ dayOfWeek: 1, startTime: "11:00", endTime: "09:00" }],
      })
    ).rejects.toThrow("Giờ bắt đầu phải trước giờ kết thúc");

    expect(uow.mentorProfiles.replaceAvailabilitySlots).not.toHaveBeenCalled();
  });

  // 7. Validation: min 30 minutes
  it("should throw error when slot is less than 30 minutes", async () => {
    setupHappyPath();

    await expect(
      useCase.execute({
        userId: "mentor_001",
        slots: [{ dayOfWeek: 1, startTime: "09:00", endTime: "09:20" }],
      })
    ).rejects.toThrow("Mỗi khung giờ phải ít nhất 30 phút");

    expect(uow.mentorProfiles.replaceAvailabilitySlots).not.toHaveBeenCalled();
  });

  // 8. Validation: outside 07:00-21:00
  it("should throw error when slot is outside 07:00-21:00 range (before 07:00)", async () => {
    setupHappyPath();

    await expect(
      useCase.execute({
        userId: "mentor_001",
        slots: [{ dayOfWeek: 1, startTime: "06:00", endTime: "07:30" }],
      })
    ).rejects.toThrow("07:00");

    expect(uow.mentorProfiles.replaceAvailabilitySlots).not.toHaveBeenCalled();
  });

  it("should throw error when slot is outside 07:00-21:00 range (after 21:00)", async () => {
    setupHappyPath();

    await expect(
      useCase.execute({
        userId: "mentor_001",
        slots: [{ dayOfWeek: 1, startTime: "20:00", endTime: "22:00" }],
      })
    ).rejects.toThrow("21:00");

    expect(uow.mentorProfiles.replaceAvailabilitySlots).not.toHaveBeenCalled();
  });

  // 9. Validation: overlapping slots on same day
  it("should throw error when slots overlap on the same day", async () => {
    setupHappyPath();

    await expect(
      useCase.execute({
        userId: "mentor_001",
        slots: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
          { dayOfWeek: 1, startTime: "10:30", endTime: "12:00" },
        ],
      })
    ).rejects.toThrow("bị trùng");

    expect(uow.mentorProfiles.replaceAvailabilitySlots).not.toHaveBeenCalled();
  });

  // 10. Empty slots array — should work (clear all slots)
  it("should work with empty slots array (clear all slots)", async () => {
    setupHappyPath();

    await useCase.execute({ userId: "mentor_001", slots: [] });

    expect(uow.mentorProfiles.replaceAvailabilitySlots).toHaveBeenCalledWith(
      "profile-1",
      []
    );
  });

  // 11. Audit log created
  it("should create audit log with MENTOR_AVAILABILITY_UPDATED action", async () => {
    setupHappyPath();

    await useCase.execute({ userId: "mentor_001", slots: validSlots });

    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "mentor_001",
        action: "MENTOR_AVAILABILITY_UPDATED",
        newValues: expect.objectContaining({
          slotCount: 2,
          profileId: "profile-1",
        }),
        performedBy: "mentor_001",
      })
    );
  });

  it("should generate unique IDs for each slot", async () => {
    setupHappyPath();

    await useCase.execute({ userId: "mentor_001", slots: validSlots });

    const call = uow.mentorProfiles.replaceAvailabilitySlots.mock.calls[0];
    const slots = call[1]; // second argument (the slots array)
    expect(slots).toHaveLength(2);
    expect(slots[0].id).toBeTruthy();
    expect(slots[1].id).toBeTruthy();
    expect(slots[0].id).not.toBe(slots[1].id);
  });

  it("should set isRecurring to true for each slot", async () => {
    setupHappyPath();

    await useCase.execute({ userId: "mentor_001", slots: validSlots });

    const call = uow.mentorProfiles.replaceAvailabilitySlots.mock.calls[0];
    const slots = call[1];
    slots.forEach((slot: any) => {
      expect(slot.isRecurring).toBe(true);
    });
  });
});
