import { ReportCategory } from '../../../../packages/shared/src/enums';

export const EXPIRY_MINUTES: Record<ReportCategory, number> = {
  [ReportCategory.VEHICLE_ISSUE]: 60,
  [ReportCategory.TRAFFIC]: 30,
  [ReportCategory.INSPECTORS]: 20,
  [ReportCategory.SAFETY]: 45,
  [ReportCategory.OTHER]: 30,
};
