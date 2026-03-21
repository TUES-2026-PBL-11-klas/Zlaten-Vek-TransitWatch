import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './create-report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest {
  user: { userId: string };
}

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReport(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportService.createReport(req.user.userId, dto);
  }

  @Get('active')
  async getActiveReports() {
    return this.reportService.getActiveReports();
  }

  @Get('line/:lineId')
  async getReportsByLine(@Param('lineId') lineId: string) {
    return this.reportService.getReportsByLine(lineId);
  }

  @Get(':id')
  async getReportById(@Param('id') id: string) {
    const report = await this.reportService.getReportById(id);
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteReport(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const report = await this.reportService.getReportById(id);
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (report.userId !== req.user.userId) {
      throw new ForbiddenException('You can only delete your own reports');
    }
    await this.reportService.deleteReport(id);
  }
}
