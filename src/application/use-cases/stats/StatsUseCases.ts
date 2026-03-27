import { IUnitOfWork } from "../../interfaces/IUnitOfWork";
import { MenteeStats, MentorStats } from "../../../domain/repositories/ISessionRepository";

// ─── GetMenteeLearningStatsUseCase ────────────────────────────────────────────

export class GetMenteeLearningStatsUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(menteeId: string): Promise<MenteeStats> {
    const user = await this.uow.users.findById(menteeId);
    if (!user) throw new Error("Không tìm thấy người dùng");

    return this.uow.sessions.getMenteeStats(menteeId);
  }
}

// ─── GetMentorTeachingStatsUseCase ────────────────────────────────────────────

export class GetMentorTeachingStatsUseCase {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute(mentorId: string): Promise<MentorStats> {
    const user = await this.uow.users.findById(mentorId);
    if (!user) throw new Error("Không tìm thấy người dùng");
    if (!user.isMentor() && !user.isAdmin()) {
      throw new Error("Người dùng không phải là Mentor");
    }

    return this.uow.sessions.getMentorStats(mentorId);
  }
}
