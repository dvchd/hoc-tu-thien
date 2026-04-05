import { GetMenteeLearningStatsUseCase, GetMentorTeachingStatsUseCase } from "../../../../application/use-cases/stats/StatsUseCases";
import { IUnitOfWork } from "../../../../application/interfaces/IUnitOfWork";
import { UserEntity } from "../../../../domain/entities/User";
import { Email } from "../../../../domain/value-objects/Email";
import { UserRole } from "../../../../domain/value-objects/UserRole";

describe("StatsUseCases", () => {
  let uow: jest.Mocked<IUnitOfWork>;
  let mockUserRepo: any;
  let mockSessionRepo: any;

  beforeEach(() => {
    mockUserRepo = {
      findById: jest.fn(),
    };
    mockSessionRepo = {
      getMenteeStats: jest.fn(),
      getMentorStats: jest.fn(),
    };
    uow = {
      users: mockUserRepo,
      sessions: mockSessionRepo,
    } as any;
  });

  describe("GetMenteeLearningStatsUseCase", () => {
    let useCase: GetMenteeLearningStatsUseCase;

    beforeEach(() => {
      useCase = new GetMenteeLearningStatsUseCase(uow);
    });

    it("throws an error if user is not found", async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute("non-existent-id")).rejects.toThrow("Không tìm thấy người dùng");
    });

    it("returns mentee stats if user exists", async () => {
      const mockUser = UserEntity.create({ id: "user-id", email: "mentee@test.com", role: UserRole.MENTEE });
      mockUserRepo.findById.mockResolvedValue(mockUser);
      
      const mockStats = { totalSessions: 5, completedSessions: 3, totalHours: 3 };
      mockSessionRepo.getMenteeStats.mockResolvedValue(mockStats);

      const stats = await useCase.execute("user-id");

      expect(stats).toEqual(mockStats);
      expect(mockSessionRepo.getMenteeStats).toHaveBeenCalledWith("user-id");
    });
  });

  describe("GetMentorTeachingStatsUseCase", () => {
    let useCase: GetMentorTeachingStatsUseCase;

    beforeEach(() => {
      useCase = new GetMentorTeachingStatsUseCase(uow);
    });

    it("throws an error if user is not found", async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute("non-existent-id")).rejects.toThrow("Không tìm thấy người dùng");
    });

    it("throws an error if user is not a mentor or admin", async () => {
      const mockUser = UserEntity.create({ id: "mentee-id", email: "mentee@test.com", role: UserRole.MENTEE });
      mockUserRepo.findById.mockResolvedValue(mockUser);

      await expect(useCase.execute("mentee-id")).rejects.toThrow("Người dùng không phải là Mentor");
    });

    it("returns mentor stats if user is a mentor", async () => {
      const mockUser = UserEntity.create({ id: "mentor-id", email: "mentor@test.com", role: UserRole.MENTOR });
      mockUserRepo.findById.mockResolvedValue(mockUser);
      
      const mockStats = { totalSessions: 10, completedSessions: 8, totalHours: 8, averageRating: 4.5 };
      mockSessionRepo.getMentorStats.mockResolvedValue(mockStats);

      const stats = await useCase.execute("mentor-id");

      expect(stats).toEqual(mockStats);
      expect(mockSessionRepo.getMentorStats).toHaveBeenCalledWith("mentor-id");
    });

    it("returns mentor stats if user is an admin", async () => {
      const mockUser = UserEntity.create({ id: "admin-id", email: "admin@test.com", role: UserRole.ADMIN });
      mockUserRepo.findById.mockResolvedValue(mockUser);
      
      const mockStats = { totalSessions: 0, completedSessions: 0, totalHours: 0, averageRating: 0 };
      mockSessionRepo.getMentorStats.mockResolvedValue(mockStats);

      const stats = await useCase.execute("admin-id");

      expect(stats).toEqual(mockStats);
      expect(mockSessionRepo.getMentorStats).toHaveBeenCalledWith("admin-id");
    });
  });
});
