import { Report } from '@prisma/client';

export interface IReportRepository {
  findById(id: string): Promise<Report | null>;
  findActiveByStop(stopId: string): Promise<Report[]>;
  findActiveAll(): Promise<Report[]>;
  findExpired(): Promise<Report[]>;
  save(data: {
    userId: string;
    stopId: string;
    category: string;
    description?: string;
    expiresAt: Date;
  }): Promise<Report>;
  markExpired(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
}

export const REPORT_REPOSITORY = 'IReportRepository';
