import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import type { IReportRepository } from './report-repository.interface';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';

@Injectable()
export class ReportExpiryJobService implements OnModuleInit {
  private readonly logger = new Logger(ReportExpiryJobService.name);

  constructor(
    @Inject('IReportRepository')
    private readonly reportRepository: IReportRepository,
    @InjectMetric('reports_expired_total')
    private readonly reportsExpiredCounter: Counter,
    @InjectMetric('active_reports_gauge')
    private readonly activeReportsGauge: Gauge,
  ) {}

  async onModuleInit() {
    try {
      const activeReports = await this.reportRepository.findActiveAll();
      this.activeReportsGauge.set(activeReports.length);
      this.logger.log(
        `Initialized active reports gauge: ${activeReports.length}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to initialize active reports gauge: ${(error as Error).message}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiry() {
    const expiredReports = await this.reportRepository.findExpired();

    for (const report of expiredReports) {
      await this.reportRepository.markExpired(report.id);
    }

    if (expiredReports.length > 0) {
      this.reportsExpiredCounter.inc(expiredReports.length);
      this.activeReportsGauge.dec(expiredReports.length);
    }

    this.logger.log(`Expired ${expiredReports.length} reports`);
  }
}
