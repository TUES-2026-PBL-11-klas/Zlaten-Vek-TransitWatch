import { ReportCategory } from '../../../../../packages/shared/src/enums';
import { VehicleIssueStrategy } from './vehicle-issue.strategy';
import { TrafficStrategy } from './traffic.strategy';
import { InspectorStrategy } from './inspector.strategy';
import { SafetyStrategy } from './safety.strategy';
import { OtherStrategy } from './other.strategy';
import { ReportStrategyFactory } from './report-strategy.factory';

describe('VehicleIssueStrategy', () => {
  const strategy = new VehicleIssueStrategy();

  it('returns 60 expiry minutes', () => {
    expect(strategy.getExpiryMinutes()).toBe(60);
  });

  it('returns credibility weight of 1', () => {
    expect(strategy.getCredibilityWeight()).toBe(1);
  });

  it('returns auto-hide threshold of 3', () => {
    expect(strategy.getAutoHideThreshold()).toBe(3);
  });
});

describe('TrafficStrategy', () => {
  const strategy = new TrafficStrategy();

  it('returns 30 expiry minutes', () => {
    expect(strategy.getExpiryMinutes()).toBe(30);
  });

  it('returns credibility weight of 1', () => {
    expect(strategy.getCredibilityWeight()).toBe(1);
  });

  it('returns auto-hide threshold of 2', () => {
    expect(strategy.getAutoHideThreshold()).toBe(2);
  });
});

describe('InspectorStrategy', () => {
  const strategy = new InspectorStrategy();

  it('returns 20 expiry minutes', () => {
    expect(strategy.getExpiryMinutes()).toBe(20);
  });

  it('returns credibility weight of 2 (higher authority)', () => {
    expect(strategy.getCredibilityWeight()).toBe(2);
  });

  it('returns auto-hide threshold of 2', () => {
    expect(strategy.getAutoHideThreshold()).toBe(2);
  });
});

describe('SafetyStrategy', () => {
  const strategy = new SafetyStrategy();

  it('returns 45 expiry minutes', () => {
    expect(strategy.getExpiryMinutes()).toBe(45);
  });

  it('returns credibility weight of 1', () => {
    expect(strategy.getCredibilityWeight()).toBe(1);
  });

  it('returns auto-hide threshold of 4 (highest — requires more disputes)', () => {
    expect(strategy.getAutoHideThreshold()).toBe(4);
  });
});

describe('OtherStrategy', () => {
  const strategy = new OtherStrategy();

  it('returns 30 expiry minutes', () => {
    expect(strategy.getExpiryMinutes()).toBe(30);
  });

  it('returns credibility weight of 1', () => {
    expect(strategy.getCredibilityWeight()).toBe(1);
  });

  it('returns auto-hide threshold of 2', () => {
    expect(strategy.getAutoHideThreshold()).toBe(2);
  });
});

describe('Strategy cross-category invariants', () => {
  it('Inspector has the shortest expiry of all categories', () => {
    const expiries = [
      new VehicleIssueStrategy().getExpiryMinutes(),
      new TrafficStrategy().getExpiryMinutes(),
      new SafetyStrategy().getExpiryMinutes(),
      new OtherStrategy().getExpiryMinutes(),
    ];
    const inspector = new InspectorStrategy().getExpiryMinutes();
    expect(expiries.every((e) => inspector <= e)).toBe(true);
  });

  it('Safety has the highest auto-hide threshold of all categories', () => {
    const thresholds = [
      new VehicleIssueStrategy().getAutoHideThreshold(),
      new TrafficStrategy().getAutoHideThreshold(),
      new InspectorStrategy().getAutoHideThreshold(),
      new OtherStrategy().getAutoHideThreshold(),
    ];
    const safety = new SafetyStrategy().getAutoHideThreshold();
    expect(thresholds.every((t) => safety >= t)).toBe(true);
  });
});

describe('ReportStrategyFactory', () => {
  let factory: ReportStrategyFactory;

  beforeEach(() => {
    factory = new ReportStrategyFactory();
  });

  it('returns VehicleIssueStrategy for VEHICLE_ISSUE', () => {
    expect(factory.getStrategy(ReportCategory.VEHICLE_ISSUE)).toBeInstanceOf(
      VehicleIssueStrategy,
    );
  });

  it('returns TrafficStrategy for TRAFFIC', () => {
    expect(factory.getStrategy(ReportCategory.TRAFFIC)).toBeInstanceOf(
      TrafficStrategy,
    );
  });

  it('returns InspectorStrategy for INSPECTORS', () => {
    expect(factory.getStrategy(ReportCategory.INSPECTORS)).toBeInstanceOf(
      InspectorStrategy,
    );
  });

  it('returns SafetyStrategy for SAFETY', () => {
    expect(factory.getStrategy(ReportCategory.SAFETY)).toBeInstanceOf(
      SafetyStrategy,
    );
  });

  it('returns OtherStrategy for OTHER', () => {
    expect(factory.getStrategy(ReportCategory.OTHER)).toBeInstanceOf(
      OtherStrategy,
    );
  });

  it('all strategies satisfy the IReportStrategy interface', () => {
    const categories = Object.values(ReportCategory);
    for (const category of categories) {
      const strategy = factory.getStrategy(category);
      expect(typeof strategy.getExpiryMinutes()).toBe('number');
      expect(typeof strategy.getCredibilityWeight()).toBe('number');
      expect(typeof strategy.getAutoHideThreshold()).toBe('number');
    }
  });

  it('throws for an unknown category', () => {
    expect(() => factory.getStrategy('UNKNOWN' as ReportCategory)).toThrow(
      'No strategy found for report category: UNKNOWN',
    );
  });
});
