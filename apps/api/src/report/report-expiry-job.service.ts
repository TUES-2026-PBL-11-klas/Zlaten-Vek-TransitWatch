import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import type { IReportRepository } from './report-repository.interface';

@Injectable()
export class ReportExpiryJobService {
  private readonly logger = new Logger(ReportExpiryJobService.name);

  constructor(
    @Inject('IReportRepository')
    private readonly reportRepository: IReportRepository,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiry() {
    const expiredReports = await this.reportRepository.findExpired();

    for (const report of expiredReports) {
      await this.reportRepository.markExpired(report.id);
    }

    this.logger.log(`Expired ${expiredReports.length} reports`);
  }
}