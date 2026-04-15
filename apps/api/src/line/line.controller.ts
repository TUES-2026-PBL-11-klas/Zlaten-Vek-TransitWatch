import { Controller, Get, Param } from '@nestjs/common';
import { LineService } from './line.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('lines')
export class LineController {
  constructor(private readonly lineService: LineService) {}

  @Get()
  @Public()
  async findAll() {
    return this.lineService.findAll();
  }

  @Get(':id')
  @Public()
  async findById(@Param('id') id: string) {
    return this.lineService.findById(id);
  }

  @Get(':id/reports')
  @Public()
  async findReports(@Param('id') id: string) {
    return this.lineService.findActiveReports(id);
  }
}
