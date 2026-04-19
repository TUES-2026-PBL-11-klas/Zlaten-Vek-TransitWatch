import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaVoteRepository } from './prisma-vote.repository';

const mockTx = {
  report: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  vote: {
    findUnique: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
};

const mockPrisma = {
  $transaction: jest.fn((fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
  vote: {
    count: jest.fn(),
    findUnique: jest.fn(),
  },
};

const baseReport = {
  id: 'r1',
  userId: 'owner-id',
  credibilityScore: 0,
  status: 'active',
};

const newVote = {
  id: 'v1',
  reportId: 'r1',
  userId: 'voter-id',
  type: 'confirm',
};

function setupHappyPath(
  type: 'confirm' | 'dispute' = 'confirm',
  confirms = 1,
  disputes = 0,
  reportStatus = 'active',
) {
  mockTx.report.findUnique.mockResolvedValue({
    ...baseReport,
    status: reportStatus,
  });
  mockTx.vote.findUnique.mockResolvedValue(null);
  mockTx.vote.create.mockResolvedValue({ ...newVote, type });
  mockTx.vote.count
    .mockResolvedValueOnce(confirms)
    .mockResolvedValueOnce(disputes);
  mockTx.report.update.mockResolvedValue({
    credibilityScore: confirms - disputes,
    status: reportStatus,
  });
}

describe('PrismaVoteRepository', () => {
  let repo: PrismaVoteRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaVoteRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repo = module.get<PrismaVoteRepository>(PrismaVoteRepository);
  });

  describe('castVote', () => {
    describe('guard clauses', () => {
      it('throws NotFoundException when report is not found', async () => {
        mockTx.report.findUnique.mockResolvedValue(null);
        await expect(
          repo.castVote({ reportId: 'r1', userId: 'u1', type: 'confirm' }),
        ).rejects.toThrow(new NotFoundException('Report not found'));
      });

      it('throws ForbiddenException when voting on own report', async () => {
        mockTx.report.findUnique.mockResolvedValue(baseReport);
        await expect(
          repo.castVote({
            reportId: 'r1',
            userId: 'owner-id',
            type: 'confirm',
          }),
        ).rejects.toThrow(
          new ForbiddenException('You cannot vote on your own report'),
        );
      });

      it('throws ConflictException when user already voted', async () => {
        mockTx.report.findUnique.mockResolvedValue(baseReport);
        mockTx.vote.findUnique.mockResolvedValue({ id: 'existing-vote' });
        await expect(
          repo.castVote({
            reportId: 'r1',
            userId: 'voter-id',
            type: 'confirm',
          }),
        ).rejects.toThrow(
          new ConflictException('Already voted on this report'),
        );
      });
    });

    describe('status transitions', () => {
      it('keeps status active when confirms < VERIFIED_THRESHOLD (2)', async () => {
        setupHappyPath('confirm', 1, 0);
        mockTx.report.update.mockResolvedValue({
          credibilityScore: 1,
          status: 'active',
        });
        const result = await repo.castVote({
          reportId: 'r1',
          userId: 'voter-id',
          type: 'confirm',
        });
        expect(mockTx.report.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: 'active' }),
          }),
        );
        expect(result.reportStatus).toBe('active');
      });

      it('sets status to verified when confirms reaches VERIFIED_THRESHOLD (2)', async () => {
        setupHappyPath('confirm', 2, 0);
        mockTx.report.update.mockResolvedValue({
          credibilityScore: 2,
          status: 'verified',
        });
        const result = await repo.castVote({
          reportId: 'r1',
          userId: 'voter-id',
          type: 'confirm',
        });
        expect(mockTx.report.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: 'verified' }),
          }),
        );
        expect(result.reportStatus).toBe('verified');
      });

      it('sets status to hidden when disputes reaches HIDDEN_THRESHOLD (2)', async () => {
        setupHappyPath('dispute', 0, 2);
        mockTx.report.update.mockResolvedValue({
          credibilityScore: -2,
          status: 'hidden',
        });
        const result = await repo.castVote({
          reportId: 'r1',
          userId: 'voter-id',
          type: 'dispute',
        });
        expect(mockTx.report.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: 'hidden' }),
          }),
        );
        expect(result.reportStatus).toBe('hidden');
      });

      it('hidden takes priority over verified when disputes >= 2 and confirms >= 2', async () => {
        setupHappyPath('confirm', 2, 2);
        mockTx.report.update.mockResolvedValue({
          credibilityScore: 0,
          status: 'hidden',
        });
        await repo.castVote({
          reportId: 'r1',
          userId: 'voter-id',
          type: 'confirm',
        });
        expect(mockTx.report.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: 'hidden' }),
          }),
        );
      });

      it('does not change status when report is already hidden', async () => {
        setupHappyPath('confirm', 1, 0, 'hidden');
        mockTx.report.update.mockResolvedValue({
          credibilityScore: 1,
          status: 'hidden',
        });
        await repo.castVote({
          reportId: 'r1',
          userId: 'voter-id',
          type: 'confirm',
        });
        // status 'hidden' is not 'active' or 'verified', so it should stay hidden
        expect(mockTx.report.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: 'hidden' }),
          }),
        );
      });
    });

    describe('credibility score', () => {
      it('increments credibility by +1 for a confirm vote', async () => {
        setupHappyPath('confirm', 1, 0);
        mockTx.report.update.mockResolvedValue({
          credibilityScore: 1,
          status: 'active',
        });
        const result = await repo.castVote({
          reportId: 'r1',
          userId: 'voter-id',
          type: 'confirm',
        });
        expect(mockTx.report.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ credibilityScore: 1 }),
          }),
        );
        expect(result.reportCredibilityScore).toBe(1);
      });

      it('decrements credibility by -1 for a dispute vote', async () => {
        setupHappyPath('dispute', 0, 1);
        mockTx.report.update.mockResolvedValue({
          credibilityScore: -1,
          status: 'active',
        });
        const result = await repo.castVote({
          reportId: 'r1',
          userId: 'voter-id',
          type: 'dispute',
        });
        expect(mockTx.report.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ credibilityScore: -1 }),
          }),
        );
        expect(result.reportCredibilityScore).toBe(-1);
      });
    });

    describe('return shape', () => {
      it('returns vote, reportCredibilityScore, reportStatus, and counts', async () => {
        setupHappyPath('confirm', 1, 0);
        mockTx.report.update.mockResolvedValue({
          credibilityScore: 1,
          status: 'active',
        });
        const result = await repo.castVote({
          reportId: 'r1',
          userId: 'voter-id',
          type: 'confirm',
        });
        expect(result).toMatchObject({
          vote: expect.objectContaining({ type: 'confirm' }),
          reportCredibilityScore: 1,
          reportStatus: 'active',
          counts: { confirms: 1, disputes: 0 },
        });
      });
    });
  });

  describe('countVotes', () => {
    it('returns confirms and disputes counts', async () => {
      mockPrisma.vote.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
      const result = await repo.countVotes('r1');
      expect(result).toEqual({ confirms: 3, disputes: 1 });
    });

    it('returns zero counts for a report with no votes', async () => {
      mockPrisma.vote.count.mockResolvedValue(0);
      const result = await repo.countVotes('r1');
      expect(result).toEqual({ confirms: 0, disputes: 0 });
    });

    it('queries with correct where conditions', async () => {
      mockPrisma.vote.count.mockResolvedValue(0);
      await repo.countVotes('r1');
      expect(mockPrisma.vote.count).toHaveBeenCalledWith({
        where: { reportId: 'r1', type: 'confirm' },
      });
      expect(mockPrisma.vote.count).toHaveBeenCalledWith({
        where: { reportId: 'r1', type: 'dispute' },
      });
    });
  });

  describe('findUserVote', () => {
    it('returns confirm when the vote type is confirm', async () => {
      mockPrisma.vote.findUnique.mockResolvedValue({ type: 'confirm' });
      expect(await repo.findUserVote('r1', 'u1')).toBe('confirm');
    });

    it('returns dispute when the vote type is dispute', async () => {
      mockPrisma.vote.findUnique.mockResolvedValue({ type: 'dispute' });
      expect(await repo.findUserVote('r1', 'u1')).toBe('dispute');
    });

    it('returns null when no vote record exists', async () => {
      mockPrisma.vote.findUnique.mockResolvedValue(null);
      expect(await repo.findUserVote('r1', 'u1')).toBeNull();
    });

    it('queries with the composite unique key', async () => {
      mockPrisma.vote.findUnique.mockResolvedValue(null);
      await repo.findUserVote('r1', 'u1');
      expect(mockPrisma.vote.findUnique).toHaveBeenCalledWith({
        where: { reportId_userId: { reportId: 'r1', userId: 'u1' } },
        select: { type: true },
      });
    });
  });
});
