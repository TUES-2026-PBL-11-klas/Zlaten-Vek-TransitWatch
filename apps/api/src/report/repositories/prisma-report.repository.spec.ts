import { Test, TestingModule } from '@nestjs/testing';
import { PrismaReportRepository } from './prisma-report.repository';
import { PrismaService } from '../../prisma/prisma.service';
import type { Report } from '@prisma/client';

const mockPrismaReport = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrisma = { report: mockPrismaReport };

describe('PrismaReportRepository', () => {
  let repo: PrismaReportRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaReportRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repo = module.get<PrismaReportRepository>(PrismaReportRepository);
  });

  describe('findById', () => {
    it('returns report when found', async () => {
      const report = { id: 'r1' } as Report;
      mockPrismaReport.findUnique.mockResolvedValue(report);

      const result = await repo.findById('r1');

      expect(result).toBe(report);
      expect(mockPrismaReport.findUnique).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it('returns null when report does not exist', async () => {
      mockPrismaReport.findUnique.mockResolvedValue(null);

      expect(await repo.findById('missing')).toBeNull();
    });
  });

  describe('findActiveAll', () => {
    it('queries with status=active and expiresAt > now', async () => {
      mockPrismaReport.findMany.mockResolvedValue([]);

      await repo.findActiveAll();

      const [arg] = mockPrismaReport.findMany.mock.calls[0];
      expect(arg.where.status).toBe('active');
      expect(arg.where.expiresAt).toHaveProperty('gt');
      expect(arg.where.expiresAt.gt).toBeInstanceOf(Date);
    });
  });

  describe('findActiveByLine', () => {
    it('adds lineId to the active filter', async () => {
      mockPrismaReport.findMany.mockResolvedValue([]);

      await repo.findActiveByLine('line-7');

      const [arg] = mockPrismaReport.findMany.mock.calls[0];
      expect(arg.where.lineId).toBe('line-7');
      expect(arg.where.status).toBe('active');
      expect(arg.where.expiresAt).toHaveProperty('gt');
    });
  });

  describe('findExpired', () => {
    it('queries active reports whose expiresAt is in the past', async () => {
      mockPrismaReport.findMany.mockResolvedValue([]);

      await repo.findExpired();

      const [arg] = mockPrismaReport.findMany.mock.calls[0];
      expect(arg.where.status).toBe('active');
      expect(arg.where.expiresAt).toHaveProperty('lt');
      expect(arg.where.expiresAt.lt).toBeInstanceOf(Date);
    });
  });

  describe('save', () => {
    it('persists a report entity and returns it', async () => {
      const data = {
        userId: 'u1',
        lineId: 'l1',
        category: 'VEHICLE_ISSUE',
        credibilityScore: 5,
        expiresAt: new Date(),
      };
      const created = { id: 'new-id', ...data } as unknown as Report;
      mockPrismaReport.create.mockResolvedValue(created);

      const result = await repo.save(data);

      expect(result).toBe(created);
      expect(mockPrismaReport.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('markExpired', () => {
    it('bulk-updates matching report status to expired', async () => {
      mockPrismaReport.update.mockResolvedValue(undefined);

      await repo.markExpired('r5');

      expect(mockPrismaReport.update).toHaveBeenCalledWith({
        where: { id: 'r5' },
        data: { status: 'expired' },
      });
    });
  });

  describe('delete', () => {
    it('removes report by ID', async () => {
      mockPrismaReport.delete.mockResolvedValue(undefined);

      await repo.delete('r6');

      expect(mockPrismaReport.delete).toHaveBeenCalledWith({ where: { id: 'r6' } });
    });
  });
});
