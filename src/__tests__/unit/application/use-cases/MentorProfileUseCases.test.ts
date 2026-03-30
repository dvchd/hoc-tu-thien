import { GetMentorPublicProfileUseCase, UpdateMentorProfileUseCase, SetTeachingFieldsUseCase } from "@/application/use-cases/mentor/MentorProfileUseCases";
import { createMockUnitOfWork, buildUser, buildMentor, buildMentee, buildAdmin } from "@/__tests__/helpers";
import { MentorProfileRecord } from "@/domain/repositories/IMentorProfileRepository";
import { UserRole } from "@/domain/value-objects/UserRole";

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const buildMentorProfileRecord = (overrides: Partial<MentorProfileRecord> = {}): MentorProfileRecord => ({
  id: "prof_001",
  userId: "mentor_001",
  bio: "React expert with 5 years experience",
  experience: "5",
  headline: "Senior React Developer",
  hourlyRate: 50000,
  charityAccountId: "charity_001",
  onlyActivatedMentee: false,
  isActive: true,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  user: { name: "Mentor User", email: "mentor@example.com", image: null },
  charityAccount: { id: "charity_001", name: "Quy Thien Nguyen", accountNo: "2000", bankName: "MB Bank" },
  teachingFields: [
    { id: "mtf_001", field: { id: "tf_001", name: "React", icon: null } },
  ],
  availabilitySlots: [
    { id: "slot_001", dayOfWeek: 1, startTime: "09:00", endTime: "11:00", isRecurring: true },
  ],
  totalSessions: 10,
  averageRating: 4.5,
  ratingCount: 8,
  ...overrides,
});

// ─── GetMentorPublicProfileUseCase ──────────────────────────────────────────────

describe("GetMentorPublicProfileUseCase", () => {
  let useCase: GetMentorPublicProfileUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
    useCase = new GetMentorPublicProfileUseCase(uow);
  });

  it("should throw error if user not found", async () => {
    uow.users.findById.mockResolvedValue(null);

    await expect(useCase.execute("unknown_id")).rejects.toThrow("Không tìm thấy người dùng");
  });

  it("should throw error if user is not a mentor", async () => {
    uow.users.findById.mockResolvedValue(buildMentee()); // MENTEE role

    await expect(useCase.execute("user_001")).rejects.toThrow("không phải là Mentor");
  });

  it("should throw error if mentor has no profile", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute("mentor_001")).rejects.toThrow("Mentor chưa thiết lập hồ sơ");
  });

  it("should return public profile with all fields", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());

    const result = await useCase.execute("mentor_001");

    expect(result.user.id).toBe("mentor_001");
    expect(result.user.name).toBe("Test User");
    expect(result.profile.headline).toBe("Senior React Developer");
    expect(result.profile.expertise).toBe("React expert with 5 years experience");
    expect(result.profile.hourlyRate).toBe(50000);
    expect(result.profile.totalSessions).toBe(10);
    expect(result.profile.rating).toBe(4.5);
    expect(result.profile.ratingCount).toBe(8);
    expect(result.profile.isAvailable).toBe(true);
    expect(result.profile.onlyActivatedMentee).toBe(false);
    expect(result.profile.charityAccount).toEqual({ name: "Quy Thien Nguyen", accountNo: "2000" });
    expect(result.teachingFields).toHaveLength(1);
    expect(result.teachingFields[0].name).toBe("React");
    expect(result.availabilitySlots).toHaveLength(1);
    expect(result.availabilitySlots[0].dayOfWeek).toBe(1);
  });

  it("should return null charityAccount when not set", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(
      buildMentorProfileRecord({ charityAccount: undefined })
    );

    const result = await useCase.execute("mentor_001");
    expect(result.profile.charityAccount).toBeNull();
  });

  it("should return empty arrays when no teaching fields or availability", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(
      buildMentorProfileRecord({ teachingFields: undefined, availabilitySlots: undefined })
    );

    const result = await useCase.execute("mentor_001");
    expect(result.teachingFields).toEqual([]);
    expect(result.availabilitySlots).toEqual([]);
  });

  it("should allow admin to view mentor profile", async () => {
    uow.users.findById.mockResolvedValue(buildAdmin());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());

    const result = await useCase.execute("admin_001");
    expect(result.profile.headline).toBe("Senior React Developer");
  });

  it("should handle experience as string and parse to number", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(
      buildMentorProfileRecord({ experience: "3" })
    );

    const result = await useCase.execute("mentor_001");
    expect(result.profile.experience).toBe(3);
  });

  it("should handle null experience", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(
      buildMentorProfileRecord({ experience: null })
    );

    const result = await useCase.execute("mentor_001");
    expect(result.profile.experience).toBeNull();
  });

  it("should handle numeric experience from DB", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    // Some DBs return number directly
    uow.mentorProfiles.findByUserId.mockResolvedValue(
      buildMentorProfileRecord({ experience: 7 as any })
    );

    const result = await useCase.execute("mentor_001");
    expect(result.profile.experience).toBe(7);
  });
});

// ─── UpdateMentorProfileUseCase ────────────────────────────────────────────────

describe("UpdateMentorProfileUseCase", () => {
  let useCase: UpdateMentorProfileUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
    useCase = new UpdateMentorProfileUseCase(uow);
  });

  it("should throw error if user not found", async () => {
    uow.users.findById.mockResolvedValue(null);

    await expect(useCase.execute({ userId: "unknown" })).rejects.toThrow("Không tìm thấy người dùng");
  });

  it("should throw error if user is not a mentor", async () => {
    uow.users.findById.mockResolvedValue(buildMentee()); // MENTEE role

    await expect(useCase.execute({ userId: "mentee_001" })).rejects.toThrow("Chỉ Mentor mới có thể cập nhật");
  });

  it("should create new profile if none exists", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(null);
    uow.mentorProfiles.create.mockResolvedValue(buildMentorProfileRecord());

    const result = await useCase.execute({
      userId: "mentor_001",
      headline: "New Mentor",
      expertise: "JavaScript",
      hourlyRate: 30000,
      updatedBy: "mentor_001",
    });

    expect(result.created).toBe(true);
    expect(uow.mentorProfiles.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "mentor_001",
        headline: "New Mentor",
        bio: "JavaScript",
        hourlyRate: 30000,
      })
    );
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MENTOR_PROFILE_CREATED" })
    );
  });

  it("should update existing profile", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());
    uow.mentorProfiles.update.mockResolvedValue(buildMentorProfileRecord());

    const result = await useCase.execute({
      userId: "mentor_001",
      headline: "Updated Headline",
      hourlyRate: 60000,
      updatedBy: "mentor_001",
    });

    expect(result.created).toBe(false);
    expect(uow.mentorProfiles.update).toHaveBeenCalledWith(
      "prof_001",
      expect.objectContaining({ headline: "Updated Headline", hourlyRate: 60000 })
    );
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MENTOR_PROFILE_UPDATED" })
    );
  });

  it("should validate charityAccountId when provided", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());
    uow.charityAccounts.findById.mockResolvedValue(null);

    await expect(useCase.execute({
      userId: "mentor_001",
      charityAccountId: "invalid_id",
    })).rejects.toThrow("Tài khoản thiện nguyện không hợp lệ");
  });

  it("should reject inactive charity account", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());
    uow.charityAccounts.findById.mockResolvedValue({
      id: "charity_001",
      accountNo: "2000",
      name: "Inactive",
      bankName: "MB Bank",
      isActive: false,
      isDefault: false,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      createdBy: null,
      verificationStatus: "UNVERIFIED",
      verificationPaymentId: null,
      verificationShortCode: null,
      verifiedAt: null,
      verifiedBy: null,
      verificationNote: null,
    });

    await expect(useCase.execute({
      userId: "mentor_001",
      charityAccountId: "charity_001",
    })).rejects.toThrow("Tài khoản thiện nguyện không hợp lệ hoặc đã bị vô hiệu hóa");
  });

  it("should accept valid active charity account", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());
    uow.charityAccounts.findById.mockResolvedValue({
      id: "charity_001",
      accountNo: "2000",
      name: "Active Charity",
      bankName: "MB Bank",
      isActive: true,
      isDefault: false,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      createdBy: null,
      verificationStatus: "UNVERIFIED",
      verificationPaymentId: null,
      verificationShortCode: null,
      verifiedAt: null,
      verifiedBy: null,
      verificationNote: null,
    });
    uow.mentorProfiles.update.mockResolvedValue(buildMentorProfileRecord());

    await useCase.execute({
      userId: "mentor_001",
      charityAccountId: "charity_001",
    });

    expect(uow.mentorProfiles.update).toHaveBeenCalledWith(
      "prof_001",
      expect.objectContaining({ charityAccountId: "charity_001" })
    );
  });

  it("should map onlyActivatedMentee and isAvailable correctly", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());
    uow.mentorProfiles.update.mockResolvedValue(buildMentorProfileRecord());

    await useCase.execute({
      userId: "mentor_001",
      onlyActivatedMentee: true,
      isAvailable: false,
    });

    expect(uow.mentorProfiles.update).toHaveBeenCalledWith(
      "prof_001",
      expect.objectContaining({ onlyActivatedMentee: true, isActive: false })
    );
  });

  it("should create audit log with old values for update", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(
      buildMentorProfileRecord({ headline: "Old Headline", hourlyRate: 40000 })
    );
    uow.mentorProfiles.update.mockResolvedValue(buildMentorProfileRecord());

    await useCase.execute({
      userId: "mentor_001",
      headline: "New Headline",
      hourlyRate: 50000,
    });

    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MENTOR_PROFILE_UPDATED",
        oldValues: expect.objectContaining({ headline: "Old Headline", hourlyRate: 40000 }),
        newValues: expect.objectContaining({ headline: "New Headline", hourlyRate: 50000 }),
      })
    );
  });
});

// ─── SetTeachingFieldsUseCase ─────────────────────────────────────────────────

describe("SetTeachingFieldsUseCase", () => {
  let useCase: SetTeachingFieldsUseCase;
  let uow: ReturnType<typeof createMockUnitOfWork>;

  beforeEach(() => {
    uow = createMockUnitOfWork();
    useCase = new SetTeachingFieldsUseCase(uow);
  });

  it("should throw error if user not found", async () => {
    uow.users.findById.mockResolvedValue(null);

    await expect(useCase.execute({ userId: "unknown", fieldIds: [] }))
      .rejects.toThrow("Không tìm thấy người dùng");
  });

  it("should throw error if user is not a mentor", async () => {
    uow.users.findById.mockResolvedValue(buildMentee()); // MENTEE role

    await expect(useCase.execute({ userId: "mentee_001", fieldIds: ["tf_001"] }))
      .rejects.toThrow("Chỉ Mentor mới có thể cập nhật môn học");
  });

  it("should throw error if mentor has no profile", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute({ userId: "mentor_001", fieldIds: ["tf_001"] }))
      .rejects.toThrow("Mentor chưa thiết lập hồ sơ");
  });

  it("should throw error for invalid teaching field ID", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());
    uow.teachingFields.findById.mockResolvedValue(null);

    await expect(useCase.execute({ userId: "mentor_001", fieldIds: ["invalid_field"] }))
      .rejects.toThrow("Môn học không hợp lệ hoặc đã bị ẩn: invalid_field");
  });

  it("should throw error for inactive teaching field", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());
    uow.teachingFields.findById.mockResolvedValue({
      id: "tf_001",
      name: "React",
      slug: "react",
      description: null,
      icon: null,
      isActive: false,
      sortOrder: 0,
    });

    await expect(useCase.execute({ userId: "mentor_001", fieldIds: ["tf_001"] }))
      .rejects.toThrow("Môn học không hợp lệ hoặc đã bị ẩn: tf_001");
  });

  it("should set teaching fields successfully", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());
    uow.teachingFields.findById.mockResolvedValue({
      id: "tf_001",
      name: "React",
      slug: "react",
      description: null,
      icon: null,
      isActive: true,
      sortOrder: 0,
    });

    await useCase.execute({
      userId: "mentor_001",
      fieldIds: ["tf_001"],
      updatedBy: "mentor_001",
    });

    expect(uow.teachingFields.setMentorFields).toHaveBeenCalledWith("prof_001", ["tf_001"]);
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MENTOR_TEACHING_FIELDS_UPDATED",
        newValues: expect.objectContaining({ fieldIds: ["tf_001"], profileId: "prof_001" }),
      })
    );
  });

  it("should validate all field IDs before setting", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());

    // First field valid, second invalid
    uow.teachingFields.findById
      .mockResolvedValueOnce({ id: "tf_001", name: "React", slug: "react", description: null, icon: null, isActive: true, sortOrder: 0 })
      .mockResolvedValueOnce(null);

    await expect(useCase.execute({ userId: "mentor_001", fieldIds: ["tf_001", "tf_invalid"] }))
      .rejects.toThrow("Môn học không hợp lệ hoặc đã bị ẩn: tf_invalid");

    // setMentorFields should NOT be called if validation fails
    expect(uow.teachingFields.setMentorFields).not.toHaveBeenCalled();
  });

  it("should handle empty field IDs list", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());

    await useCase.execute({ userId: "mentor_001", fieldIds: [] });

    expect(uow.teachingFields.setMentorFields).toHaveBeenCalledWith("prof_001", []);
    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MENTOR_TEACHING_FIELDS_UPDATED" })
    );
  });

  it("should use userId as performedBy when updatedBy not provided", async () => {
    uow.users.findById.mockResolvedValue(buildMentor());
    uow.mentorProfiles.findByUserId.mockResolvedValue(buildMentorProfileRecord());
    uow.teachingFields.findById.mockResolvedValue({
      id: "tf_001", name: "React", slug: "react", description: null, icon: null, isActive: true, sortOrder: 0,
    });

    await useCase.execute({ userId: "mentor_001", fieldIds: ["tf_001"] });

    expect(uow.users.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ performedBy: "mentor_001" })
    );
  });
});
