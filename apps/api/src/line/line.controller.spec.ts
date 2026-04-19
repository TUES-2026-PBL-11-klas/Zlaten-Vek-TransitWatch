import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LineController } from './line.controller';
import { LineService } from './line.service';

const mockLineService = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveReports: jest.fn(),
};

describe('LineController', () => {
  let controller: LineController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LineController],
      providers: [{ provide: LineService, useValue: mockLineService }],
    }).compile();

    controller = module.get<LineController>(LineController);
  });

  describe('findAll', () => {
    it('delegates to lineService.findAll and returns result', async () => {
      const lines = [{ id: '1', name: '94', type: 'bus' }];
      mockLineService.findAll.mockResolvedValue(lines);
      expect(await controller.findAll()).toEqual(lines);
      expect(mockLineService.findAll).toHaveBeenCalled();
    });

    it('returns empty array when no lines exist', async () => {
      mockLineService.findAll.mockResolvedValue([]);
      expect(await controller.findAll()).toEqual([]);
    });
  });

  describe('findById', () => {
    it('delegates to lineService.findById and returns result', async () => {
      const line = { id: '1', name: '94', type: 'bus', stops: [] };
      mockLineService.findById.mockResolvedValue(line);
      expect(await controller.findById('1')).toEqual(line);
      expect(mockLineService.findById).toHaveBeenCalledWith('1');
    });

    it('propagates NotFoundException from service', async () => {
      mockLineService.findById.mockRejectedValue(
        new NotFoundException('Line not found'),
      );
      await expect(controller.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findReports', () => {
    it('delegates to lineService.findActiveReports and returns result', async () => {
      const reports = [{ id: 'r1' }];
      mockLineService.findActiveReports.mockResolvedValue(reports);
      expect(await controller.findReports('line-1')).toEqual(reports);
      expect(mockLineService.findActiveReports).toHaveBeenCalledWith('line-1');
    });

    it('propagates NotFoundException from service', async () => {
      mockLineService.findActiveReports.mockRejectedValue(
        new NotFoundException('Line not found'),
      );
      await expect(controller.findReports('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
