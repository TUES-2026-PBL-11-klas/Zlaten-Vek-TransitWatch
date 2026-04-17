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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReportService } from './report.service';
import { CreateReportDto } from './create-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { AuthService } from '../auth/auth.service';

interface AuthenticatedRequest {
  user: { userId: string; email: string };
}

@ApiTags('reports')
@Controller('reports')
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(
    private readonly reportService: ReportService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @ApiBearerAuth('supabase-jwt')
  @ApiOperation({ summary: 'Create a new transit issue report' })
  @ApiResponse({ status: 201, description: 'Report created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
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
  @ApiOperation({ summary: 'Get all active (non-expired) reports' })
  @ApiResponse({ status: 200, description: 'List of active reports' })
  async getActiveReports() {
    return this.reportService.getActiveReports();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('supabase-jwt')
  @ApiOperation({ summary: 'Get reports submitted by the authenticated user' })
  @ApiResponse({
    status: 200,
    description: "List of the current user's reports",
  })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async getMyReports(@Request() req: AuthenticatedRequest) {
    return this.reportService.getReportsByUser(req.user.userId);
  }

  @Get('line/:lineId')
  @Public()
  @ApiOperation({ summary: 'Get active reports for a specific transit line' })
  @ApiParam({ name: 'lineId', description: 'Transit line UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of active reports on the line',
  })
  async getReportsByLine(@Param('lineId') lineId: string) {
    return this.reportService.getReportsByLine(lineId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single report by ID' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'Report found' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReportById(@Param('id') id: string) {
    const report = await this.reportService.getReportById(id);
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('supabase-jwt')
  @ApiOperation({ summary: 'Delete a report (owner only)' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'Report deleted' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Not the report owner' })
  @ApiResponse({ status: 404, description: 'Report not found' })
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
