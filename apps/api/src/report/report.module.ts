import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { Report } from './report.entity';
import { TypeOrmReportRepository } from './type-orm-report.repository';
import { ReportExpiryJobService } from './report-expiry-job.service';

@Module({
  imports: [TypeOrmModule.forFeature([Report]), ScheduleModule.forRoot()],
  controllers: [ReportController],
  providers: [
    ReportService,
    ReportExpiryJobService,
    {
      provide: 'IReportRepository',
      useClass: TypeOrmReportRepository,
    },
  ],
  exports: [ReportService],
})
export class ReportModule {}
