import { ReportCategory, ReportStatus } from '../enums';

export interface ReportResponseDto {
  id: string;
  userId: string;
  lineId: string;
  category: ReportCategory;
  status: ReportStatus;
  description: string | null;
  photoUrl: string | null;
  credibilityScore: number;
  expiresAt: string;
  createdAt: string;
}
