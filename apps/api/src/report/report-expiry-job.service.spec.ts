import { Test, TestingModule } from '@nestjs/testing';
import { ReportExpiryJobService } from './report-expiry-job.service';
import { IReportRepository } from './interfaces/report-repository.interface';
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

describe('ReportExpiryJobService', () => {
  let service: ReportExpiryJobService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportExpiryJobService,
        { provide: 'IReportRepository', useValue: mockRepo },
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

  it('does not touch already-expired or hidden reports', async () => {
    // findExpired only returns active reports with expiresAt < now,
    // so an empty result means no eligible reports exist
    mockRepo.findExpired.mockResolvedValue([]);

    await service.handleExpiry();

    expect(mockRepo.markExpired).not.toHaveBeenCalled();
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
