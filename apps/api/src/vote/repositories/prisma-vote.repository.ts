import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Vote } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IVoteRepository } from '../interfaces/vote-repository.interface';

@Injectable()
export class PrismaVoteRepository implements IVoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async castVote(params: {
    reportId: string;
    userId: string;
    type: 'confirm' | 'dispute';
  }): Promise<{ vote: Vote; authorScore: number }> {
    const { reportId, userId, type } = params;

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id: reportId },
        select: { id: true, userId: true },
      });
      if (!report) throw new NotFoundException('Report not found');

      const existing = await tx.vote.findUnique({
        where: { reportId_userId: { reportId, userId } },
      });
      if (existing) throw new ConflictException('Already voted on this report');

      const vote = await tx.vote.create({
        data: { reportId, userId, type },
      });

      const delta = type === 'confirm' ? 1 : -1;
      const author = await tx.user.findUnique({
        where: { id: report.userId },
        select: { credibilityScore: true },
      });
      const current = author?.credibilityScore ?? 0;
      const next = Math.max(0, current + delta);

      const updated = await tx.user.update({
        where: { id: report.userId },
        data: { credibilityScore: next },
        select: { credibilityScore: true },
      });

      return { vote, authorScore: updated.credibilityScore };
    });
  }
}
