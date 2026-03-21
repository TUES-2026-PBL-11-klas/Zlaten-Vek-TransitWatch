import { Report } from '@prisma/client';

export interface IReportRepository {
  findById(id: string): Promise<Report | null>;
  findActiveByLine(lineId: string): Promise<Report[]>;
  findActiveAll(): Promise<Report[]>;
  findExpired(): Promise<Report[]>;
  save(data: {
    userId: string;
    lineId: string;
    category: string;
    description?: string;
    credibilityScore: number;
    expiresAt: Date;
  }): Promise<Report>;
  markExpired(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export const REPORT_REPOSITORY = 'IReportRepository';
