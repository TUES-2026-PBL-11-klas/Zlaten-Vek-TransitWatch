import { Test, TestingModule } from '@nestjs/testing';
import { ReportExpiryJobService } from './report-expiry-job.service';
import { IReportRepository } from './report-repository.interface';
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

describe('ReportExpiryJobService', () => {
  let service: ReportExpiryJobService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportExpiryJobService,
        { provide: 'IReportRepository', useValue: mockRepo },
        {
          provide: 'PROM_METRIC_REPORTS_EXPIRED_TOTAL',
          useValue: { inc: jest.fn() },
        },
        {
          provide: 'PROM_METRIC_ACTIVE_REPORTS_GAUGE',
          useValue: { inc: jest.fn(), dec: jest.fn(), set: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ReportExpiryJobService>(ReportExpiryJobService);
  });

  it('marks all active-but-past-expiry reports as expired', async () => {
    const expired = [
      { id: 'r1', status: 'active' },
      { id: 'r2', status: 'active' },
    ] as Report[];
    mockRepo.findExpired.mockResolvedValue(expired);
    mockRepo.markExpired.mockResolvedValue(undefined);

    await service.handleExpiry();

    expect(mockRepo.findExpired).toHaveBeenCalledTimes(1);
    expect(mockRepo.markExpired).toHaveBeenCalledTimes(2);
    expect(mockRepo.markExpired).toHaveBeenCalledWith('r1');
    expect(mockRepo.markExpired).toHaveBeenCalledWith('r2');
  });

  it('does nothing when no expired reports are found', async () => {
    mockRepo.findExpired.mockResolvedValue([]);

    await service.handleExpiry();

    expect(mockRepo.markExpired).not.toHaveBeenCalled();
  });

  it('stops processing remaining reports if markExpired throws', async () => {
    const expired = [
      { id: 'r1', status: 'active' },
      { id: 'r2', status: 'active' },
    ] as Report[];
    mockRepo.findExpired.mockResolvedValue(expired);
    mockRepo.markExpired.mockRejectedValueOnce(new Error('DB error'));

    await expect(service.handleExpiry()).rejects.toThrow('DB error');

    expect(mockRepo.markExpired).toHaveBeenCalledTimes(1);
    expect(mockRepo.markExpired).toHaveBeenCalledWith('r1');
  });

  it('logs the count of expired reports', async () => {
    const logSpy = jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => {});
    mockRepo.findExpired.mockResolvedValue([
      { id: 'r3', status: 'active' } as Report,
    ]);
    mockRepo.markExpired.mockResolvedValue(undefined);

    await service.handleExpiry();

    expect(logSpy).toHaveBeenCalledWith('Expired 1 reports');
  });
});
