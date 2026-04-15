import { Injectable } from '@nestjs/common';
import { Report } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IReportRepository } from '../interfaces/report-repository.interface';

const VISIBLE_STATUSES = ['active', 'verified'];

function attachCounts<T extends Report & { votes?: { type: string }[] }>(
  row: T,
): Report & { confirms: number; disputes: number } {
  const votes = row.votes ?? [];
  const rest = { ...(row as Record<string, unknown>) };
  delete rest.votes;
  return {
    ...(rest as unknown as Report),
    confirms: votes.filter((v) => v.type === 'confirm').length,
    disputes: votes.filter((v) => v.type === 'dispute').length,
  };
}

@Injectable()
export class PrismaReportRepository implements IReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Report | null> {
    return this.prisma.report.findUnique({
      where: { id },
      include: { user: { select: { id: true, credibilityScore: true } } },
    });
  }

  async findActiveByLine(lineId: string): Promise<Report[]> {
    const rows = await this.prisma.report.findMany({
      where: {
        lineId,
        status: { in: VISIBLE_STATUSES },
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { id: true, credibilityScore: true } },
        votes: { select: { type: true } },
      },
      orderBy: { credibilityScore: 'desc' },
    });
    return rows.map(attachCounts) as unknown as Report[];
  }

  async findActiveAll(): Promise<Report[]> {
    const rows = await this.prisma.report.findMany({
      where: {
        status: { in: VISIBLE_STATUSES },
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { id: true, credibilityScore: true } },
        votes: { select: { type: true } },
      },
      orderBy: { credibilityScore: 'desc' },
    });
    return rows.map(attachCounts) as unknown as Report[];
  }

  save(data: {
    userId: string;
    lineId: string;
    vehicleId?: string;
    category: string;
    description?: string;
    photoUrl?: string;
    credibilityScore: number;
    expiresAt: Date;
  }): Promise<Report> {
    return this.prisma.report.create({ data });
  }

  findByUserId(userId: string): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { line: true },
    });
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
