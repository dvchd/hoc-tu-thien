import { 
  ConfirmCompletionUseCase, 
  MarkNoShowUseCase 
} from "../../../application/use-cases/session/SessionUseCases";
import { IUnitOfWork } from "../../../application/interfaces/IUnitOfWork";
import { SessionStatus } from "../../../domain/value-objects/Payment";
import { addHours, subHours } from "date-fns";

describe("SessionUseCases", () => {
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    mockUow = {
      users: { findById: jest.fn(), createAuditLog: jest.fn() },
      sessions: { 
        countActiveByMenteeId: jest.fn(), 
        findConflictingSession: jest.fn(),
        getMentorProfileFee: jest.fn(),
        create: jest.fn(),
        findById: jest.fn(),
        updateStatus: jest.fn(),
        updateConfirmation: jest.fn(),
      },
      systemConfig: { getValue: jest.fn() },
      execute: jest.fn((work) => work(mockUow)),
    } as any;
  });

  describe("ConfirmCompletionUseCase", () => {
    it("should update mentor confirmation and keep status CONFIRMED if mentee hasn't confirmed", async () => {
      const useCase = new ConfirmCompletionUseCase(mockUow);
      const mockSession = { 
        id: "s1", mentorId: "m1", menteeId: "u1", 
        status: SessionStatus.CONFIRMED,
        mentorConfirmed: false,
        menteeConfirmed: false
      };
      mockUow.sessions.findById = jest.fn().mockResolvedValue(mockSession);
      mockUow.sessions.updateConfirmation = jest.fn().mockResolvedValue({ ...mockSession, mentorConfirmed: true });

      const result = await useCase.execute("s1", "m1");
      
      expect(mockUow.sessions.updateConfirmation).toHaveBeenCalledWith("s1", "mentor", expect.anything());
      expect(result.status).toBe(SessionStatus.CONFIRMED);
    });

    it("should set status to COMPLETED if both confirmed", async () => {
      const useCase = new ConfirmCompletionUseCase(mockUow);
      const mockSession = { 
        id: "s1", mentorId: "m1", menteeId: "u1", 
        status: SessionStatus.CONFIRMED,
        mentorConfirmed: false,
        menteeConfirmed: true
      };
      mockUow.sessions.findById = jest.fn().mockResolvedValue(mockSession);
      mockUow.sessions.updateConfirmation = jest.fn().mockResolvedValue({ 
        ...mockSession, mentorConfirmed: true, status: SessionStatus.COMPLETED 
      });

      const result = await useCase.execute("s1", "m1");
      
      expect(result.status).toBe(SessionStatus.COMPLETED);
    });
  });

  describe("MarkNoShowUseCase", () => {
    it("should fail if called before session start", async () => {
      const useCase = new MarkNoShowUseCase(mockUow);
      const mockSession = { 
        id: "s1", 
        mentorId: "m1", 
        status: SessionStatus.CONFIRMED,
        scheduledAt: addHours(new Date(), 1) 
      };
      mockUow.sessions.findById = jest.fn().mockResolvedValue(mockSession);

      await expect(useCase.execute("s1", "m1"))
        .rejects.toThrow("Chưa đến giờ buổi học");
    });

    it("should mark session as NO_SHOW if called after start and fee is 0", async () => {
      const useCase = new MarkNoShowUseCase(mockUow);
      const mockSession = { 
        id: "s1", mentorId: "m1", 
        status: SessionStatus.CONFIRMED,
        scheduledAt: subHours(new Date(), 1),
        fee: 0
      };
      mockUow.sessions.findById = jest.fn().mockResolvedValue(mockSession);
      mockUow.sessions.updateStatus = jest.fn().mockResolvedValue({ ...mockSession, status: SessionStatus.NO_SHOW });

      const result = await useCase.execute("s1", "m1");
      
      expect(result.status).toBe(SessionStatus.NO_SHOW);
      expect(mockUow.sessions.updateStatus).toHaveBeenCalledWith("s1", SessionStatus.NO_SHOW, expect.objectContaining({ isNoShow: true }));
    });
  });
});
