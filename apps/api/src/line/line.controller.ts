import { Controller } from '@nestjs/common';
import { LineService } from './line.service';

@Controller('lines')
export class LineController {
  constructor(private readonly lineService: LineService) {}
}
