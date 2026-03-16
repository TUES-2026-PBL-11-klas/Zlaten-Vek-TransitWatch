import { Inject, Injectable } from '@nestjs/common';
import type { Report } from '@prisma/client';
import type { IReportRepository } from './report-repository.interface';
import { CreateReportDto } from './create-report.dto';
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

    return this.reportRepository.save({
      userId,
      stopId: dto.stopId,
      category: dto.category,
      description: dto.description,
      expiresAt,
    });
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
