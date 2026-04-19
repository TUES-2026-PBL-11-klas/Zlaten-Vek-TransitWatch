import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { IReportRepository } from './report-repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../user/interfaces/user-repository.interface';
import { ReportCategory } from '../../../../packages/shared/src/enums/report-category.enum';
import { ReportStrategyFactory } from './strategies/report-strategy.factory';
import type { Report } from '@prisma/client';

const mockRepo: jest.Mocked<IReportRepository> = {
  save: jest.fn(),
  findActiveAll: jest.fn(),
  findActiveByLine: jest.fn(),
  findById: jest.fn(),
  findExpired: jest.fn(),
  markExpired: jest.fn(),
  findByUserId: jest.fn(),
  delete: jest.fn(),
};

const mockUserRepo: jest.Mocked<IUserRepository> = {
  findById: jest.fn().mockResolvedValue({
    id: 'user-uuid-1',
    email: 'u@example.com',
    credibilityScore: 0,
    createdAt: new Date(),
  }),
  upsert: jest.fn(),
};

const mockReportsCounter = { inc: jest.fn() };
const mockActiveGauge = { inc: jest.fn(), dec: jest.fn(), set: jest.fn() };

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        ReportStrategyFactory,
        { provide: 'IReportRepository', useValue: mockRepo },
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
        {
          provide: 'PROM_METRIC_REPORTS_CREATED_TOTAL',
          useValue: mockReportsCounter,
        },
        {
          provide: 'PROM_METRIC_ACTIVE_REPORTS_GAUGE',
          useValue: mockActiveGauge,
        },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
  });

  describe('createReport', () => {
    const userId = 'user-uuid-1';
    const fakeReport = {
      id: 'r1',
      userId,
      credibilityScore: 5,
      status: 'active',
    } as Report;
    const NOW = new Date('2026-04-03T12:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(NOW);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each([
      [ReportCategory.VEHICLE_ISSUE, 60],
      [ReportCategory.TRAFFIC, 30],
      [ReportCategory.INSPECTORS, 20],
      [ReportCategory.SAFETY, 45],
      [ReportCategory.OTHER, 30],
    ])(
      'sets correct expires_at for category %s (%i min)',
      async (category, expectedMinutes) => {
        mockRepo.save.mockResolvedValue(fakeReport);

        await service.createReport(userId, { lineId: 'line-1', category });

        const savedData = mockRepo.save.mock.calls[0][0];
        const expected = new Date(NOW.getTime() + expectedMinutes * 60_000);
        expect(savedData.expiresAt).toEqual(expected);
      },
    );

    it('sets initial credibilityScore to 5', async () => {
      mockRepo.save.mockResolvedValue(fakeReport);

      await service.createReport(userId, {
        lineId: 'line-1',
        category: ReportCategory.OTHER,
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ credibilityScore: 5 }),
      );
    });

    it('passes userId, lineId, category and description to the repository', async () => {
      mockRepo.save.mockResolvedValue(fakeReport);

      await service.createReport(userId, {
        lineId: 'line-42',
        category: ReportCategory.TRAFFIC,
        description: 'Big delay',
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          lineId: 'line-42',
          category: ReportCategory.TRAFFIC,
          description: 'Big delay',
        }),
      );
    });

    it('works when optional description is omitted', async () => {
      mockRepo.save.mockResolvedValue(fakeReport);

      await service.createReport(userId, {
        lineId: 'line-1',
        category: ReportCategory.INSPECTORS,
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          lineId: 'line-1',
          category: ReportCategory.INSPECTORS,
          description: undefined,
        }),
      );
    });

    it('adds author credibilityScore to the initial score of 5', async () => {
      mockUserRepo.findById.mockResolvedValue({
        id: userId,
        email: 'u@example.com',
        credibilityScore: 10,
        createdAt: new Date(),
      });
      mockRepo.save.mockResolvedValue(fakeReport);

      await service.createReport(userId, {
        lineId: 'line-1',
        category: ReportCategory.OTHER,
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ credibilityScore: 15 }),
      );
    });

    it('defaults to credibilityScore of 5 when author is not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue(fakeReport);

      await service.createReport(userId, {
        lineId: 'line-1',
        category: ReportCategory.OTHER,
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ credibilityScore: 5 }),
      );
    });

    it('passes optional vehicleId and photoUrl to the repository', async () => {
      mockRepo.save.mockResolvedValue(fakeReport);

      await service.createReport(userId, {
        lineId: 'line-1',
        category: ReportCategory.VEHICLE_ISSUE,
        vehicleId: 'VH-1042',
        photoUrl: 'https://storage.example.com/photo.jpg',
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleId: 'VH-1042',
          photoUrl: 'https://storage.example.com/photo.jpg',
        }),
      );
    });

    it('increments the reports_created_total counter with the category', async () => {
      mockRepo.save.mockResolvedValue(fakeReport);

      await service.createReport(userId, {
        lineId: 'line-1',
        category: ReportCategory.TRAFFIC,
      });

      expect(mockReportsCounter.inc).toHaveBeenCalledWith({
        category: ReportCategory.TRAFFIC,
      });
    });

    it('increments the active_reports_gauge after creating a report', async () => {
      mockRepo.save.mockResolvedValue(fakeReport);

      await service.createReport(userId, {
        lineId: 'line-1',
        category: ReportCategory.SAFETY,
      });

      expect(mockActiveGauge.inc).toHaveBeenCalledTimes(1);
    });
  });

  describe('getActiveReports', () => {
    it('returns only active reports', async () => {
      const reports = [{ id: 'r1' }, { id: 'r2' }] as Report[];
      mockRepo.findActiveAll.mockResolvedValue(reports);

      const result = await service.getActiveReports();

      expect(result).toBe(reports);
      expect(mockRepo.findActiveAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getReportsByLine', () => {
    it('filters by lineId correctly', async () => {
      const reports = [{ id: 'r3', lineId: 'line-99' }] as Report[];
      mockRepo.findActiveByLine.mockResolvedValue(reports);

      const result = await service.getReportsByLine('line-99');

      expect(result).toBe(reports);
      expect(mockRepo.findActiveByLine).toHaveBeenCalledWith('line-99');
    });
  });

  describe('getReportById', () => {
    it('returns report when found', async () => {
      const report = { id: 'r4' } as Report;
      mockRepo.findById.mockResolvedValue(report);

      const result = await service.getReportById('r4');

      expect(result).toBe(report);
      expect(mockRepo.findById).toHaveBeenCalledWith('r4');
    });

    it('returns null when report does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await service.getReportById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getReportsByUser', () => {
    it('returns reports for the given userId', async () => {
      const reports = [{ id: 'r5', userId: 'user-uuid-1' }] as Report[];
      mockRepo.findByUserId.mockResolvedValue(reports);

      const result = await service.getReportsByUser('user-uuid-1');

      expect(result).toBe(reports);
      expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-uuid-1');
    });

    it('returns empty array when the user has no reports', async () => {
      mockRepo.findByUserId.mockResolvedValue([]);

      const result = await service.getReportsByUser('user-uuid-1');

      expect(result).toEqual([]);
    });
  });

  describe('deleteReport', () => {
    it('delegates delete to repository', async () => {
      mockRepo.delete.mockResolvedValue(undefined);

      await service.deleteReport('r5');

      expect(mockRepo.delete).toHaveBeenCalledWith('r5');
    });
  });

  describe('expireReport', () => {
    it('delegates markExpired to repository', async () => {
      mockRepo.markExpired.mockResolvedValue(undefined);

      await service.expireReport('r6');

      expect(mockRepo.markExpired).toHaveBeenCalledWith('r6');
    });
  });
});
