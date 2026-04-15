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
}
