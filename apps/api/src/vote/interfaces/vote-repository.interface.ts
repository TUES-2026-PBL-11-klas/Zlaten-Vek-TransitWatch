import { Vote } from '@prisma/client';

export interface VoteCounts {
  confirms: number;
  disputes: number;
}

export interface CastVoteResult {
  vote: Vote;
  reportCredibilityScore: number;
  reportStatus: string;
  counts: VoteCounts;
}

export interface IVoteRepository {
  castVote(params: {
    reportId: string;
    userId: string;
    type: 'confirm' | 'dispute';
  }): Promise<CastVoteResult>;

  countVotes(reportId: string): Promise<VoteCounts>;

  findUserVote(
    reportId: string,
    userId: string,
  ): Promise<'confirm' | 'dispute' | null>;
}

export const VOTE_REPOSITORY = 'IVoteRepository';
