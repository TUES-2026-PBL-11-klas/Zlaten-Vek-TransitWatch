import { ReportCategory, ReportStatus } from '../enums';

export interface ReportResponseDto {
  id: string;
  userId: string;
  stopId: string;
  category: ReportCategory;
  status: ReportStatus;
  description: string;
  confirmations: number;
  disputes: number;
  expiresAt: string;
  createdAt: string;
}
