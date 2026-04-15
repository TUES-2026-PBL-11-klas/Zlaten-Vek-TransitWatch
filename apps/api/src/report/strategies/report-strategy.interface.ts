export interface IReportStrategy {
  getExpiryMinutes(): number;
  getCredibilityWeight(): number;
  getAutoHideThreshold(): number;
}
