import { PrismaClient } from "@prisma/client";
import {
  ITeachingFieldRepository,
  TeachingFieldRecord,
} from "../../../domain/repositories/ISessionRepository";

type PrismaTransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class PrismaTeachingFieldRepository implements ITeachingFieldRepository {
  constructor(private readonly prisma: PrismaClient | PrismaTransactionClient) {}

  async findAll(): Promise<TeachingFieldRecord[]> {
    return this.prisma.teachingField.findMany({
      where: { isDeleted: false },
      orderBy: { sortOrder: "asc" },
    });
  }

  async findById(id: string): Promise<TeachingFieldRecord | null> {
    return this.prisma.teachingField.findUnique({
      where: { id, isDeleted: false },
    });
  }

  async findByMentorId(mentorProfileId: string): Promise<TeachingFieldRecord[]> {
    const relations = await this.prisma.mentorTeachingField.findMany({
      where: { mentorProfileId },
      include: { teachingField: true },
    });
    return relations.map((r) => r.teachingField);
  }

  async create(input: Omit<TeachingFieldRecord, "id">): Promise<TeachingFieldRecord> {
    return this.prisma.teachingField.create({
      data: input,
    });
  }

  async update(id: string, data: Partial<TeachingFieldRecord>): Promise<TeachingFieldRecord> {
    return this.prisma.teachingField.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.teachingField.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async setMentorFields(mentorProfileId: string, fieldIds: string[]): Promise<void> {
    // Xóa tất cả fields cũ của mentor
    await this.prisma.mentorTeachingField.deleteMany({
      where: { mentorProfileId },
    });

    // Thêm fields mới
    if (fieldIds.length > 0) {
      await this.prisma.mentorTeachingField.createMany({
        data: fieldIds.map((fieldId) => ({
          mentorProfileId,
          teachingFieldId: fieldId,
        })),
      });
    }
  }
}
