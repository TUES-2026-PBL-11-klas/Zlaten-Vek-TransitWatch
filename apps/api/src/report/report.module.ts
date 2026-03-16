import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { PrismaReportRepository } from './repositories/prisma-report.repository';
import { ReportExpiryJobService } from './report-expiry-job.service';
import { REPORT_REPOSITORY } from './interfaces/report-repository.interface';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ReportController],
  providers: [
    ReportService,
    ReportExpiryJobService,
    { provide: REPORT_REPOSITORY, useClass: PrismaReportRepository },
  ],
  exports: [REPORT_REPOSITORY],
})
export class ReportModule {}
