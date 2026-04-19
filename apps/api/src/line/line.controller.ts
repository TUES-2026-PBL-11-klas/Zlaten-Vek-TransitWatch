import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LineService } from './line.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('lines')
@Controller('lines')
export class LineController {
  constructor(private readonly lineService: LineService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all transit lines' })
  @ApiResponse({
    status: 200,
    description: 'List of all transit lines with id, name, and type',
  })
  async findAll() {
    return this.lineService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a transit line by ID including its stops' })
  @ApiParam({ name: 'id', description: 'Transit line UUID' })
  @ApiResponse({ status: 200, description: 'Line found with stops' })
  @ApiResponse({ status: 404, description: 'Line not found' })
  async findById(@Param('id') id: string) {
    return this.lineService.findById(id);
  }

  @Get(':id/reports')
  @Public()
  @ApiOperation({ summary: 'Get active reports for a transit line' })
  @ApiParam({ name: 'id', description: 'Transit line UUID' })
  @ApiResponse({ status: 200, description: 'Active reports on the line' })
  @ApiResponse({ status: 404, description: 'Line not found' })
  async findReports(@Param('id') id: string) {
    return this.lineService.findActiveReports(id);
  }
}
