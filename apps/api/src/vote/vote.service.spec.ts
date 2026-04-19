import { Test, TestingModule } from '@nestjs/testing';
import { VoteService } from './vote.service';
import {
  IVoteRepository,
  VOTE_REPOSITORY,
} from './interfaces/vote-repository.interface';

const mockRepo: jest.Mocked<IVoteRepository> = {
  castVote: jest.fn(),
  countVotes: jest.fn(),
  findUserVote: jest.fn(),
};

const mockVotesCounter = { inc: jest.fn() };

describe('VoteService', () => {
  let service: VoteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteService,
        { provide: VOTE_REPOSITORY, useValue: mockRepo },
        { provide: 'PROM_METRIC_VOTES_TOTAL', useValue: mockVotesCounter },
      ],
    }).compile();

    service = module.get<VoteService>(VoteService);
  });

  describe('castVote', () => {
    const mockResult = {
      vote: { id: 'v1', reportId: 'r1', userId: 'u1', type: 'confirm' } as any,
      reportCredibilityScore: 1,
      reportStatus: 'active',
      counts: { confirms: 1, disputes: 0 },
    };

    it('delegates to voteRepository.castVote with correct params', async () => {
      mockRepo.castVote.mockResolvedValue(mockResult);
      await service.castVote('r1', 'u1', 'confirm');
      expect(mockRepo.castVote).toHaveBeenCalledWith({
        reportId: 'r1',
        userId: 'u1',
        type: 'confirm',
      });
    });

    it('increments votes counter with type confirm', async () => {
      mockRepo.castVote.mockResolvedValue(mockResult);
      await service.castVote('r1', 'u1', 'confirm');
      expect(mockVotesCounter.inc).toHaveBeenCalledWith({ type: 'confirm' });
    });

    it('increments votes counter with type dispute', async () => {
      const disputeResult = {
        ...mockResult,
        vote: { ...mockResult.vote, type: 'dispute' },
      };
      mockRepo.castVote.mockResolvedValue(disputeResult as any);
      await service.castVote('r1', 'u1', 'dispute');
      expect(mockVotesCounter.inc).toHaveBeenCalledWith({ type: 'dispute' });
    });

    it('returns the repository result', async () => {
      mockRepo.castVote.mockResolvedValue(mockResult);
      const result = await service.castVote('r1', 'u1', 'confirm');
      expect(result).toEqual(mockResult);
    });

    it('propagates repository errors', async () => {
      mockRepo.castVote.mockRejectedValue(new Error('DB error'));
      await expect(service.castVote('r1', 'u1', 'confirm')).rejects.toThrow(
        'DB error',
      );
    });
  });

  describe('getVoteSummary', () => {
    beforeEach(() => {
      mockRepo.countVotes.mockResolvedValue({ confirms: 2, disputes: 1 });
      mockRepo.findUserVote.mockResolvedValue('confirm');
    });

    it('calls countVotes with the reportId', async () => {
      await service.getVoteSummary('r1', 'u1');
      expect(mockRepo.countVotes).toHaveBeenCalledWith('r1');
    });

    it('calls findUserVote when userId is provided', async () => {
      await service.getVoteSummary('r1', 'u1');
      expect(mockRepo.findUserVote).toHaveBeenCalledWith('r1', 'u1');
    });

    it('does NOT call findUserVote when userId is null', async () => {
      await service.getVoteSummary('r1', null);
      expect(mockRepo.findUserVote).not.toHaveBeenCalled();
    });

    it('returns userVote: null when userId is null', async () => {
      const result = await service.getVoteSummary('r1', null);
      expect(result.userVote).toBeNull();
    });

    it('merges counts and userVote into result', async () => {
      const result = await service.getVoteSummary('r1', 'u1');
      expect(result).toEqual({ confirms: 2, disputes: 1, userVote: 'confirm' });
    });

    it('returns userVote: null when user has not voted', async () => {
      mockRepo.findUserVote.mockResolvedValue(null);
      const result = await service.getVoteSummary('r1', 'u1');
      expect(result.userVote).toBeNull();
    });
  });
});
