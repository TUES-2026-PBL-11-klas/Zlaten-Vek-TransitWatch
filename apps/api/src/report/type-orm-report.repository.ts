import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Report } from './report.entity';
import { IReportRepository } from './report-repository.interface';
import { ReportStatus } from '../../../../packages/shared/src/enums';

@Injectable()
export class TypeOrmReportRepository implements IReportRepository {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async findById(id: string): Promise<Report | null> {
    return this.reportRepository.findOneBy({ id });
  }

  async findActiveByStop(stopId: string): Promise<Report[]> {
    return this.reportRepository.find({
      where: { stopId, status: ReportStatus.ACTIVE },
    });
  }

  async findActiveAll(): Promise<Report[]> {
    return this.reportRepository.find({
      where: { status: ReportStatus.ACTIVE },
    });
  }

  async findExpired(): Promise<Report[]> {
    const now = new Date();
    return this.reportRepository.find({
      where: {
        status: ReportStatus.ACTIVE,
        expiresAt: LessThan(now),
      },
    });
  }

  async save(report: Report): Promise<Report> {
    return this.reportRepository.save(report);
  }

  async markExpired(reportId: string): Promise<void> {
    await this.reportRepository.update(reportId, { status: ReportStatus.EXPIRED });
  }

  async softDelete(reportId: string): Promise<void> {
    await this.reportRepository.update(reportId, { status: ReportStatus.HIDDEN });
  }
}