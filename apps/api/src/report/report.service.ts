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
      lineId: dto.lineId,
      vehicleId: dto.vehicleId,
      category: dto.category,
      description: dto.description,
      photoUrl: dto.photoUrl,
      credibilityScore: 5,
      expiresAt,
    });
  }

  async getActiveReports(): Promise<Report[]> {
    return this.reportRepository.findActiveAll();
  }

  async getReportsByLine(lineId: string): Promise<Report[]> {
    return this.reportRepository.findActiveByLine(lineId);
  }

  async getReportById(id: string): Promise<Report | null> {
    return this.reportRepository.findById(id);
  }

  async getReportsByUser(userId: string): Promise<Report[]> {
    return this.reportRepository.findByUserId(userId);
  }

  async deleteReport(id: string): Promise<void> {
    await this.reportRepository.delete(id);
  }

  async expireReport(reportId: string): Promise<void> {
    await this.reportRepository.markExpired(reportId);
  }
}
