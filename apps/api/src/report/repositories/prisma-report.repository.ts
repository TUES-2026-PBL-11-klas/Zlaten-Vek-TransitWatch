import { Injectable } from '@nestjs/common';
import { Report } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IReportRepository } from '../interfaces/report-repository.interface';

@Injectable()
export class PrismaReportRepository implements IReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Report | null> {
    return this.prisma.report.findUnique({ where: { id } });
  }

  findActiveByLine(lineId: string): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { lineId, status: 'active', expiresAt: { gt: new Date() } },
    });
  }

  findActiveAll(): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { status: 'active', expiresAt: { gt: new Date() } },
    });
  }

  save(data: {
    userId: string;
    lineId: string;
    category: string;
    description?: string;
    credibilityScore: number;
    expiresAt: Date;
  }): Promise<Report> {
    return this.prisma.report.create({ data });
  }

  findExpired(): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { status: 'active', expiresAt: { lt: new Date() } },
    });
  }

  async markExpired(id: string): Promise<void> {
    await this.prisma.report.update({
      where: { id },
      data: { status: 'expired' },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.report.delete({ where: { id } });
  }
}
