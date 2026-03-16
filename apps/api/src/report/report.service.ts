import { Inject, Injectable } from '@nestjs/common';
import { Report } from './report.entity';
import type { IReportRepository } from './report-repository.interface';
import { CreateReportDto } from './create-report.dto';
import { ReportCategory, ReportStatus } from '../../../../packages/shared/src/enums';
import { EXPIRY_MINUTES } from './report-expiry.strategy';

@Injectable()
export class ReportService {
  constructor(
    @Inject('IReportRepository')
    private readonly reportRepository: IReportRepository,
  ) {}

  async createReport(userId: string, dto: CreateReportDto): Promise<Report> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + EXPIRY_MINUTES[dto.category]);

    const report = new Report();
    report.userId = userId;
    report.stopId = dto.stopId;
    report.category = dto.category;
    report.description = dto.description || '';
    report.status = ReportStatus.ACTIVE;
    report.confirmations = 0;
    report.disputes = 0;
    report.expiresAt = expiresAt;

    return this.reportRepository.save(report);
  }

  async getActiveReports(): Promise<Report[]> {
    return this.reportRepository.findActiveAll();
  }

  async getReportsByStop(stopId: string): Promise<Report[]> {
    return this.reportRepository.findActiveByStop(stopId);
  }

  async getReportById(id: string): Promise<Report | null> {
    return this.reportRepository.findById(id);
  }

  async deleteReport(id: string): Promise<void> {
    await this.reportRepository.softDelete(id);
  }

  async expireReport(reportId: string): Promise<void> {
    await this.reportRepository.markExpired(reportId);
  }
}
