import { Module } from '@nestjs/common';
import { LineController } from './line.controller';
import { LineService } from './line.service';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [ReportModule],
  controllers: [LineController],
  providers: [LineService],
})
export class LineModule {}
