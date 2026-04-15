import { IReportStrategy } from './report-strategy.interface';

export class SafetyStrategy implements IReportStrategy {
  getExpiryMinutes(): number {
    return 45;
  }

  getCredibilityWeight(): number {
    return 1;
  }

  getAutoHideThreshold(): number {
    return 4;
  }
}
