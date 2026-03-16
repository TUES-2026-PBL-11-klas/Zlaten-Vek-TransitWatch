import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { PrismaReportRepository } from './repositories/prisma-report.repository';
import { REPORT_REPOSITORY } from './interfaces/report-repository.interface';

@Module({
  controllers: [ReportController],
  providers: [
    ReportService,
    { provide: REPORT_REPOSITORY, useClass: PrismaReportRepository },
  ],
  exports: [REPORT_REPOSITORY],
})
export class ReportModule {}
