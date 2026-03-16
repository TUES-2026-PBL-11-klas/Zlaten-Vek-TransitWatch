import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './create-report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReport(@Request() req, @Body() dto: CreateReportDto) {
    return this.reportService.createReport(req.user.userId, dto);
  }

  @Get('active')
  async getActiveReports() {
    return this.reportService.getActiveReports();
  }

  @Get('stop/:stopId')
  async getReportsByStop(@Param('stopId') stopId: string) {
    return this.reportService.getReportsByStop(stopId);
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
  async deleteReport(@Request() req, @Param('id') id: string) {
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
