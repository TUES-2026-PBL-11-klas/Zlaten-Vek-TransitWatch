import { Test, TestingModule } from '@nestjs/testing';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';

const mockVoteService = {
  castVote: jest.fn(),
  getVoteSummary: jest.fn(),
};

const mockUser = { userId: 'u1', email: 'user@example.com' };

describe('VoteController', () => {
  let controller: VoteController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoteController],
      providers: [{ provide: VoteService, useValue: mockVoteService }],
    }).compile();

    controller = module.get<VoteController>(VoteController);
  });

  describe('castVote (POST)', () => {
    const castResult = {
      vote: { id: 'v1' },
      reportCredibilityScore: 1,
      reportStatus: 'active',
      counts: { confirms: 1, disputes: 0 },
    };

    it('calls voteService.castVote with reportId, userId, and type', async () => {
      mockVoteService.castVote.mockResolvedValue(castResult);
      await controller.castVote('r1', mockUser as any, { type: 'confirm' });
      expect(mockVoteService.castVote).toHaveBeenCalledWith(
        'r1',
        'u1',
        'confirm',
      );
    });

    it('delegates dispute vote correctly', async () => {
      mockVoteService.castVote.mockResolvedValue(castResult);
      await controller.castVote('r1', mockUser as any, { type: 'dispute' });
      expect(mockVoteService.castVote).toHaveBeenCalledWith(
        'r1',
        'u1',
        'dispute',
      );
    });

    it('returns the result from voteService.castVote', async () => {
      mockVoteService.castVote.mockResolvedValue(castResult);
      const result = await controller.castVote('r1', mockUser as any, {
        type: 'confirm',
      });
      expect(result).toEqual(castResult);
    });
  });

  describe('getVotes (GET)', () => {
    const summaryResult = { confirms: 3, disputes: 1, userVote: 'confirm' };

    it('passes userId from authenticated request', async () => {
      mockVoteService.getVoteSummary.mockResolvedValue(summaryResult);
      const req = { user: { userId: 'u1' } } as any;
      await controller.getVotes('r1', req);
      expect(mockVoteService.getVoteSummary).toHaveBeenCalledWith('r1', 'u1');
    });

    it('passes null when req.user is null', async () => {
      mockVoteService.getVoteSummary.mockResolvedValue({
        confirms: 0,
        disputes: 0,
        userVote: null,
      });
      const req = { user: null } as any;
      await controller.getVotes('r1', req);
      expect(mockVoteService.getVoteSummary).toHaveBeenCalledWith('r1', null);
    });

    it('passes null when req.user is undefined', async () => {
      mockVoteService.getVoteSummary.mockResolvedValue({
        confirms: 0,
        disputes: 0,
        userVote: null,
      });
      const req = { user: undefined } as any;
      await controller.getVotes('r1', req);
      expect(mockVoteService.getVoteSummary).toHaveBeenCalledWith('r1', null);
    });

    it('returns the result from voteService.getVoteSummary', async () => {
      mockVoteService.getVoteSummary.mockResolvedValue(summaryResult);
      const req = { user: { userId: 'u1' } } as any;
      const result = await controller.getVotes('r1', req);
      expect(result).toEqual(summaryResult);
    });
  });
});
