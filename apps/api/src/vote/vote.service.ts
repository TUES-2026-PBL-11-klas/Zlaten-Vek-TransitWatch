import { Inject, Injectable } from '@nestjs/common';
import {
  IVoteRepository,
  VOTE_REPOSITORY,
} from './interfaces/vote-repository.interface';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

@Injectable()
export class VoteService {
  constructor(
    @Inject(VOTE_REPOSITORY)
    private readonly voteRepository: IVoteRepository,
    @InjectMetric('votes_total')
    private readonly votesCounter: Counter,
  ) {}

  async castVote(
    reportId: string,
    userId: string,
    type: 'confirm' | 'dispute',
  ) {
    const result = await this.voteRepository.castVote({
      reportId,
      userId,
      type,
    });
    this.votesCounter.inc({ type });
    return result;
  }

  async getVoteSummary(reportId: string, userId: string | null) {
    const counts = await this.voteRepository.countVotes(reportId);
    const userVote = userId
      ? await this.voteRepository.findUserVote(reportId, userId)
      : null;
    return { ...counts, userVote };
  }
}
