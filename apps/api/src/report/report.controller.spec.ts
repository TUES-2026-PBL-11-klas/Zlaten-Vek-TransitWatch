import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import type { Report } from '@prisma/client';

const mockService = {
  getReportById: jest.fn(),
  deleteReport: jest.fn(),
  createReport: jest.fn(),
  getActiveReports: jest.fn(),
  getReportsByLine: jest.fn(),
};

describe('ReportController', () => {
  let controller: ReportController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [{ provide: ReportService, useValue: mockService }],
    }).compile();

    controller = module.get<ReportController>(ReportController);
  });

  describe('deleteReport', () => {
    it('owner can delete their own report', async () => {
      const report = { id: 'r1', userId: 'user-1' } as Report;
      mockService.getReportById.mockResolvedValue(report);
      mockService.deleteReport.mockResolvedValue(undefined);

      await expect(
        controller.deleteReport({ user: { userId: 'user-1' } } as any, 'r1'),
      ).resolves.toBeUndefined();

      expect(mockService.deleteReport).toHaveBeenCalledWith('r1');
    });

    it('throws ForbiddenException when non-owner tries to delete', async () => {
      const report = { id: 'r1', userId: 'owner-id' } as Report;
      mockService.getReportById.mockResolvedValue(report);

      await expect(
        controller.deleteReport({ user: { userId: 'intruder-id' } } as any, 'r1'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockService.deleteReport).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when report does not exist', async () => {
      mockService.getReportById.mockResolvedValue(null);

      await expect(
        controller.deleteReport({ user: { userId: 'user-1' } } as any, 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReportById', () => {
    it('returns report when found', async () => {
      const report = { id: 'r2' } as Report;
      mockService.getReportById.mockResolvedValue(report);

      const result = await controller.getReportById('r2');

      expect(result).toBe(report);
    });

    it('throws NotFoundException when report is missing', async () => {
      mockService.getReportById.mockResolvedValue(null);

      await expect(controller.getReportById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getActiveReports', () => {
    it('returns active reports from service', async () => {
      const reports = [{ id: 'r3' }] as Report[];
      mockService.getActiveReports.mockResolvedValue(reports);

      const result = await controller.getActiveReports();

      expect(result).toBe(reports);
    });
  });

  describe('getReportsByLine', () => {
    it('passes lineId to service', async () => {
      const reports = [{ id: 'r4', lineId: 'line-5' }] as Report[];
      mockService.getReportsByLine.mockResolvedValue(reports);

      const result = await controller.getReportsByLine('line-5');

      expect(result).toBe(reports);
      expect(mockService.getReportsByLine).toHaveBeenCalledWith('line-5');
    });
  });
});
