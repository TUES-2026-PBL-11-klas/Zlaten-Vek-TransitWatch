import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportService } from '../report/report.service';

@Injectable()
export class LineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportService: ReportService,
  ) {}

  async findAll() {
    return this.prisma.line.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, type: true },
    });
  }

  async findById(id: string) {
    const line = await this.prisma.line.findUnique({
      where: { id },
      include: {
        lineStops: {
          include: { stop: true },
          orderBy: { stopOrder: 'asc' },
        },
      },
    });
    if (!line) throw new NotFoundException('Line not found');

    return {
      id: line.id,
      name: line.name,
      type: line.type,
      stops: line.lineStops.map((ls) => ({
        id: ls.stop.id,
        name: ls.stop.name,
        lat: ls.stop.lat,
        lng: ls.stop.lng,
        stopOrder: ls.stopOrder,
      })),
    };
  }

  async findActiveReports(lineId: string) {
    const line = await this.prisma.line.findUnique({
      where: { id: lineId },
      select: { id: true },
    });
    if (!line) throw new NotFoundException('Line not found');

    return this.reportService.getReportsByLine(lineId);
  }
}
