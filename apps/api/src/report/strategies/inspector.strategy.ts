import { IReportStrategy } from './report-strategy.interface';

export class InspectorStrategy implements IReportStrategy {
  getExpiryMinutes(): number {
    return 20;
  }

  getCredibilityWeight(): number {
    return 2;
  }

  getAutoHideThreshold(): number {
    return 2;
  }
}
