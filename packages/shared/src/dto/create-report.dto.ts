import { ReportCategory } from '../enums';

export interface CreateReportDto {
  stopId: string;
  category: ReportCategory;
  description: string;
}
