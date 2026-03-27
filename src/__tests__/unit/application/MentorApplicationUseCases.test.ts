import { SubmitMentorApplicationUseCase, ApproveMentorApplicationUseCase } from "../../../application/use-cases/mentor/MentorApplicationUseCases";
import { IUnitOfWork } from "../../../application/interfaces/IUnitOfWork";
import { UserRole } from "../../../domain/value-objects/UserRole";

describe("MentorApplicationUseCases", () => {
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    mockUow = {
      users: {
        findById: jest.fn(),
        update: jest.fn(),
        createAuditLog: jest.fn(),
      },
      mentorApplications: {
        findByUserId: jest.fn(),
        create: jest.fn(),
        findById: jest.fn(),
        updateStatus: jest.fn(),
      },
      mentorProfiles: {
        create: jest.fn(),
      },
      execute: jest.fn((work) => work(mockUow)),
    } as any;
  });

  describe("SubmitMentorApplicationUseCase", () => {
    it("should fail if user does not exist", async () => {
      const useCase = new SubmitMentorApplicationUseCase(mockUow);
      mockUow.users.findById = jest.fn().mockResolvedValue(null);
      await expect(useCase.execute({ userId: "1", motivation: "m", experience: "e" }))
        .rejects.toThrow("Không tìm thấy người dùng");
    });

    it("should fail if user already has a pending application", async () => {
      const useCase = new SubmitMentorApplicationUseCase(mockUow);
      mockUow.users.findById = jest.fn().mockResolvedValue({ 
        id: "1", 
        status: "ACTIVE", 
        isMentor: () => false,
        isAdmin: () => false 
      });
      mockUow.mentorApplications.findByUserId = jest.fn().mockResolvedValue({ status: "PENDING" });
      
      await expect(useCase.execute({ userId: "1", motivation: "m", experience: "e" }))
        .rejects.toThrow("Bạn đã có đơn đăng ký đang chờ xét duyệt");
    });

    it("should create application if valid", async () => {
      const useCase = new SubmitMentorApplicationUseCase(mockUow);
      mockUow.users.findById = jest.fn().mockResolvedValue({ 
        id: "1", 
        status: "ACTIVE", 
        isMentor: () => false,
        isAdmin: () => false 
      });
      mockUow.mentorApplications.findByUserId = jest.fn().mockResolvedValue(null);
      mockUow.mentorApplications.create = jest.fn().mockResolvedValue({ id: "app-1" });

      const result = await useCase.execute({ userId: "1", motivation: "m", experience: "e" });
      expect(result.id).toBe("app-1");
      expect(mockUow.mentorApplications.create).toHaveBeenCalled();
    });
  });

  describe("ApproveMentorApplicationUseCase", () => {
    it("should update application status, user role and log activity", async () => {
      const useCase = new ApproveMentorApplicationUseCase(mockUow);
      const mockApp = { id: "app-1", userId: "user-1", status: "PENDING" };
      const mockUser = { 
        id: "user-1", 
        promoteToMentor: jest.fn().mockReturnValue({ id: "user-1", role: UserRole.MENTOR }) 
      };
      mockUow.mentorApplications.findById = jest.fn().mockResolvedValue(mockApp);
      mockUow.users.findById = jest.fn().mockResolvedValue(mockUser);
      
      await useCase.execute("app-1", "admin-1", "Approved");

      expect(mockUow.execute).toHaveBeenCalled();
      expect(mockUow.mentorApplications.updateStatus).toHaveBeenCalledWith("app-1", "APPROVED", "admin-1", "Approved");
      expect(mockUser.promoteToMentor).toHaveBeenCalledWith("admin-1");
      expect(mockUow.users.update).toHaveBeenCalled();
      expect(mockUow.users.createAuditLog).toHaveBeenCalled();
    });
  });
});
