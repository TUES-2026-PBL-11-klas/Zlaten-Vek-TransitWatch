import { Injectable } from '@nestjs/common';
import { ReportCategory } from '../../../../../packages/shared/src/enums';
import { IReportStrategy } from './report-strategy.interface';
import { VehicleIssueStrategy } from './vehicle-issue.strategy';
import { TrafficStrategy } from './traffic.strategy';
import { InspectorStrategy } from './inspector.strategy';
import { SafetyStrategy } from './safety.strategy';
import { OtherStrategy } from './other.strategy';
import { UnknownReportCategoryException } from '../exceptions/unknown-report-category.exception';

@Injectable()
export class ReportStrategyFactory {
  private readonly strategies: Record<ReportCategory, IReportStrategy> = {
    [ReportCategory.VEHICLE_ISSUE]: new VehicleIssueStrategy(),
    [ReportCategory.TRAFFIC]: new TrafficStrategy(),
    [ReportCategory.INSPECTORS]: new InspectorStrategy(),
    [ReportCategory.SAFETY]: new SafetyStrategy(),
    [ReportCategory.OTHER]: new OtherStrategy(),
  };

  getStrategy(category: ReportCategory): IReportStrategy {
    const strategy = this.strategies[category];
    if (!strategy) {
      throw new UnknownReportCategoryException(category);
    }
    return strategy;
  }
}
