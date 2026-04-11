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
  Logger,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './create-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { AuthService } from '../auth/auth.service';

interface AuthenticatedRequest {
  user: { userId: string; email: string };
}

@Controller('reports')
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(
    private readonly reportService: ReportService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  async createReport(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateReportDto,
  ) {
    this.logger.log(`POST /reports — user: ${JSON.stringify(req.user)}`);
    this.logger.log(`POST /reports — body: ${JSON.stringify(dto)}`);

    try {
      const user = await this.authService.getOrCreateUser(
        req.user.userId,
        req.user.email,
      );
      this.logger.log(`POST /reports — user ensured: ${user.id}`);
    } catch (err) {
      this.logger.error(
        `POST /reports — getOrCreateUser failed:`,
        (err as Error).stack,
      );
      throw err;
    }

    try {
      const report = await this.reportService.createReport(
        req.user.userId,
        dto,
      );
      this.logger.log(`POST /reports — report created: ${report.id}`);
      return report;
    } catch (err) {
      this.logger.error(
        `POST /reports — createReport failed:`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  @Get('active')
  @Public()
  async getActiveReports() {
    return this.reportService.getActiveReports();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMyReports(@Request() req: AuthenticatedRequest) {
    return this.reportService.getReportsByUser(req.user.userId);
  }

  @Get('line/:lineId')
  @Public()
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
