import { Inject, Injectable } from '@nestjs/common';
import {
  IVoteRepository,
  VOTE_REPOSITORY,
} from './interfaces/vote-repository.interface';

@Injectable()
export class VoteService {
  constructor(
    @Inject(VOTE_REPOSITORY)
    private readonly voteRepository: IVoteRepository,
  ) {}

  castVote(reportId: string, userId: string, type: 'confirm' | 'dispute') {
    return this.voteRepository.castVote({ reportId, userId, type });
  }

  async getVoteSummary(reportId: string, userId: string | null) {
    const counts = await this.voteRepository.countVotes(reportId);
    const userVote = userId
      ? await this.voteRepository.findUserVote(reportId, userId)
      : null;
    return { ...counts, userVote };
  }
}
