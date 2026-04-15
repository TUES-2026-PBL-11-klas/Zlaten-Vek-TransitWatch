import { IReportStrategy } from './report-strategy.interface';

export class VehicleIssueStrategy implements IReportStrategy {
  getExpiryMinutes(): number {
    return 60;
  }

  getCredibilityWeight(): number {
    return 1;
  }

  getAutoHideThreshold(): number {
    return 3;
  }
}
