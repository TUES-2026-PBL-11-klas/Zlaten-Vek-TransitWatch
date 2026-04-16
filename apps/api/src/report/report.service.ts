import { Inject, Injectable } from '@nestjs/common';
import type { Report } from '@prisma/client';
import type { IReportRepository } from './report-repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../user/interfaces/user-repository.interface';
import { CreateReportDto } from './create-report.dto';
import { ReportStrategyFactory } from './strategies/report-strategy.factory';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';

@Injectable()
export class ReportService {
  constructor(
    @Inject('IReportRepository')
    private readonly reportRepository: IReportRepository,
    private readonly strategyFactory: ReportStrategyFactory,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @InjectMetric('reports_created_total')
    private readonly reportsCreatedCounter: Counter,
    @InjectMetric('active_reports_gauge')
    private readonly activeReportsGauge: Gauge,
  ) {}

  async createReport(userId: string, dto: CreateReportDto): Promise<Report> {
    const strategy = this.strategyFactory.getStrategy(dto.category);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + strategy.getExpiryMinutes());

    const author = await this.userRepository.findById(userId);
    const authorScore = author?.credibilityScore ?? 0;

    const report = await this.reportRepository.save({
      userId,
      lineId: dto.lineId,
      vehicleId: dto.vehicleId,
      category: dto.category,
      description: dto.description,
      photoUrl: dto.photoUrl,
      credibilityScore: 5 + authorScore,
      expiresAt,
    });

    this.reportsCreatedCounter.inc({ category: dto.category });
    this.activeReportsGauge.inc();

    return report;
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
