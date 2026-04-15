import { Vote } from '@prisma/client';

export interface IVoteRepository {
  castVote(params: {
    reportId: string;
    userId: string;
    type: 'confirm' | 'dispute';
  }): Promise<{ vote: Vote; authorScore: number }>;
}

export const VOTE_REPOSITORY = 'IVoteRepository';
