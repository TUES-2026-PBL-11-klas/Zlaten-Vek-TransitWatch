import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { IReportRepository } from './interfaces/report-repository.interface';
import { ReportCategory } from '../../../../packages/shared/src/enums/report-category.enum';
import type { Report } from '@prisma/client';

const mockRepo: jest.Mocked<IReportRepository> = {
  save: jest.fn(),
  findActiveAll: jest.fn(),
  findActiveByLine: jest.fn(),
  findById: jest.fn(),
  findExpired: jest.fn(),
  markExpired: jest.fn(),
  delete: jest.fn(),
};

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: 'IReportRepository', useValue: mockRepo },
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
        const before = new Date();

        await service.createReport(userId, { lineId: 'line-1', category });

        const savedData = mockRepo.save.mock.calls[0][0];
        const diffMs = savedData.expiresAt.getTime() - before.getTime();
        const diffMinutes = Math.round(diffMs / 60_000);
        expect(diffMinutes).toBe(expectedMinutes);
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

    it('passes userId, lineId and description to the repository', async () => {
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
          description: 'Big delay',
        }),
      );
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

  describe('deleteReport', () => {
    it('delegates delete to repository', async () => {
      mockRepo.delete.mockResolvedValue(undefined);

      await service.deleteReport('r5');

      expect(mockRepo.delete).toHaveBeenCalledWith('r5');
    });
  });
});
