import { IReportStrategy } from './report-strategy.interface';

export class TrafficStrategy implements IReportStrategy {
  getExpiryMinutes(): number {
    return 30;
  }

  getCredibilityWeight(): number {
    return 1;
  }

  getAutoHideThreshold(): number {
    return 2;
  }
}
