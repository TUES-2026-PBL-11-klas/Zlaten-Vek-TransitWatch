import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CastVoteResult,
  IVoteRepository,
  VoteCounts,
} from '../interfaces/vote-repository.interface';

const VERIFIED_THRESHOLD = 2;
const HIDDEN_THRESHOLD = 2;

@Injectable()
export class PrismaVoteRepository implements IVoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async castVote(params: {
    reportId: string;
    userId: string;
    type: 'confirm' | 'dispute';
  }): Promise<CastVoteResult> {
    const { reportId, userId, type } = params;

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          userId: true,
          credibilityScore: true,
          status: true,
        },
      });
      if (!report) throw new NotFoundException('Report not found');
      if (report.userId === userId) {
        throw new ForbiddenException('You cannot vote on your own report');
      }

      const existing = await tx.vote.findUnique({
        where: { reportId_userId: { reportId, userId } },
      });
      if (existing) throw new ConflictException('Already voted on this report');

      const vote = await tx.vote.create({
        data: { reportId, userId, type },
      });

      const delta = type === 'confirm' ? 1 : -1;
      const nextCredibility = report.credibilityScore + delta;

      const [confirms, disputes] = await Promise.all([
        tx.vote.count({ where: { reportId, type: 'confirm' } }),
        tx.vote.count({ where: { reportId, type: 'dispute' } }),
      ]);

      let nextStatus = report.status;
      if (nextStatus === 'active' || nextStatus === 'verified') {
        if (disputes >= HIDDEN_THRESHOLD) nextStatus = 'hidden';
        else if (confirms >= VERIFIED_THRESHOLD) nextStatus = 'verified';
      }

      const updated = await tx.report.update({
        where: { id: reportId },
        data: { credibilityScore: nextCredibility, status: nextStatus },
        select: { credibilityScore: true, status: true },
      });

      return {
        vote,
        reportCredibilityScore: updated.credibilityScore,
        reportStatus: updated.status,
        counts: { confirms, disputes },
      };
    });
  }

  async countVotes(reportId: string): Promise<VoteCounts> {
    const [confirms, disputes] = await Promise.all([
      this.prisma.vote.count({ where: { reportId, type: 'confirm' } }),
      this.prisma.vote.count({ where: { reportId, type: 'dispute' } }),
    ]);
    return { confirms, disputes };
  }

  async findUserVote(
    reportId: string,
    userId: string,
  ): Promise<'confirm' | 'dispute' | null> {
    const vote = await this.prisma.vote.findUnique({
      where: { reportId_userId: { reportId, userId } },
      select: { type: true },
    });
    if (!vote) return null;
    return vote.type === 'confirm' ? 'confirm' : 'dispute';
  }
}
