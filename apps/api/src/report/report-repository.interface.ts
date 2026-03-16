import { Report } from './report.entity';

export interface IReportRepository {
  findById(id: string): Promise<Report | null>;
  findActiveByStop(stopId: string): Promise<Report[]>;
  findActiveAll(): Promise<Report[]>;
  findExpired(): Promise<Report[]>;
  save(report: Report): Promise<Report>;
  markExpired(reportId: string): Promise<void>;
  softDelete(reportId: string): Promise<void>;
}