import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LineService } from './line.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportService } from '../report/report.service';

const mockLine = { id: 'line-1', findMany: jest.fn(), findUnique: jest.fn() };

const mockPrisma = {
  line: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockReportService = {
  getReportsByLine: jest.fn(),
};

describe('LineService', () => {
  let service: LineService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ReportService, useValue: mockReportService },
      ],
    }).compile();

    service = module.get<LineService>(LineService);
  });

  describe('findAll', () => {
    it('calls prisma.line.findMany with correct orderBy', async () => {
      mockPrisma.line.findMany.mockResolvedValue([]);
      await service.findAll();
      expect(mockPrisma.line.findMany).toHaveBeenCalledWith({
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, type: true },
      });
    });

    it('returns the lines from prisma', async () => {
      const lines = [{ id: '1', name: '1', type: 'bus' }];
      mockPrisma.line.findMany.mockResolvedValue(lines);
      expect(await service.findAll()).toEqual(lines);
    });

    it('returns empty array when no lines exist', async () => {
      mockPrisma.line.findMany.mockResolvedValue([]);
      expect(await service.findAll()).toEqual([]);
    });
  });

  describe('findById', () => {
    const lineWithStops = {
      id: 'line-1',
      name: '94',
      type: 'bus',
      lineStops: [
        {
          stopOrder: 1,
          stop: { id: 's1', name: 'Stop A', lat: 42.6, lng: 23.3 },
        },
        {
          stopOrder: 2,
          stop: { id: 's2', name: 'Stop B', lat: 42.61, lng: 23.31 },
        },
      ],
    };

    it('calls prisma.line.findUnique with correct args', async () => {
      mockPrisma.line.findUnique.mockResolvedValue(lineWithStops);
      await service.findById('line-1');
      expect(mockPrisma.line.findUnique).toHaveBeenCalledWith({
        where: { id: 'line-1' },
        include: {
          lineStops: {
            include: { stop: true },
            orderBy: { stopOrder: 'asc' },
          },
        },
      });
    });

    it('maps lineStops to a stops array with correct fields', async () => {
      mockPrisma.line.findUnique.mockResolvedValue(lineWithStops);
      const result = await service.findById('line-1');
      expect(result.stops).toEqual([
        { id: 's1', name: 'Stop A', lat: 42.6, lng: 23.3, stopOrder: 1 },
        { id: 's2', name: 'Stop B', lat: 42.61, lng: 23.31, stopOrder: 2 },
      ]);
    });

    it('returns id, name, type alongside stops', async () => {
      mockPrisma.line.findUnique.mockResolvedValue(lineWithStops);
      const result = await service.findById('line-1');
      expect(result.id).toBe('line-1');
      expect(result.name).toBe('94');
      expect(result.type).toBe('bus');
    });

    it('throws NotFoundException when line does not exist', async () => {
      mockPrisma.line.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(
        new NotFoundException('Line not found'),
      );
    });
  });

  describe('findActiveReports', () => {
    it('calls prisma.line.findUnique to check existence', async () => {
      mockPrisma.line.findUnique.mockResolvedValue({ id: 'line-1' });
      mockReportService.getReportsByLine.mockResolvedValue([]);
      await service.findActiveReports('line-1');
      expect(mockPrisma.line.findUnique).toHaveBeenCalledWith({
        where: { id: 'line-1' },
        select: { id: true },
      });
    });

    it('delegates to reportService.getReportsByLine', async () => {
      mockPrisma.line.findUnique.mockResolvedValue({ id: 'line-1' });
      const reports = [{ id: 'r1' }];
      mockReportService.getReportsByLine.mockResolvedValue(reports);
      const result = await service.findActiveReports('line-1');
      expect(mockReportService.getReportsByLine).toHaveBeenCalledWith('line-1');
      expect(result).toEqual(reports);
    });

    it('throws NotFoundException when line does not exist', async () => {
      mockPrisma.line.findUnique.mockResolvedValue(null);
      await expect(service.findActiveReports('missing')).rejects.toThrow(
        new NotFoundException('Line not found'),
      );
    });
  });
});
