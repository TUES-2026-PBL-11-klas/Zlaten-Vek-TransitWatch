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

  findActiveByStop(stopId: string): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { stopId, status: 'active', expiresAt: { gt: new Date() } },
    });
  }

  findActiveAll(): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { status: 'active', expiresAt: { gt: new Date() } },
    });
  }

  save(data: {
    userId: string;
    stopId: string;
    category: string;
    description?: string;
    expiresAt: Date;
  }): Promise<Report> {
    return this.prisma.report.create({ data });
  }

  markExpired(id: string): Promise<Report> {
    return this.prisma.report.update({
      where: { id },
      data: { status: 'expired' },
    });
  }
}
