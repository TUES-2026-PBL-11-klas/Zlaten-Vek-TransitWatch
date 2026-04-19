import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActiveReports, triggerReportsRefetch } from './useActiveReports';
import type { ActiveReport } from '../types/transit';

vi.mock('../lib/transit-api', () => ({
  transitApi: {
    getActiveReports: vi.fn(),
  },
}));

import { transitApi } from '../lib/transit-api';

const mockGetActiveReports = transitApi.getActiveReports as ReturnType<typeof vi.fn>;

function makeReport(id: string, lineId: string, vehicleId?: string): ActiveReport {
  return {
    id,
    lineId,
    vehicleId: vehicleId ?? null,
    category: 'TRAFFIC',
    description: null,
    credibilityScore: 0,
    status: 'active',
    expiresAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    line: { id: lineId, name: '94', type: 'bus' },
    user: { id: 'u1', email: 'u@example.com' },
  } as unknown as ActiveReport;
}

/** Flush all pending promises and settled microtasks */
async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useActiveReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // shouldAdvanceTime lets waitFor/act timeouts still work while we control timers
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with loading=true and reports=[]', () => {
    mockGetActiveReports.mockResolvedValue([]);
    const { result } = renderHook(() => useActiveReports());
    expect(result.current.loading).toBe(true);
    expect(result.current.reports).toEqual([]);
  });

  it('sets loading=false and populates reports after fetch', async () => {
    const reports = [makeReport('r1', 'line-1')];
    mockGetActiveReports.mockResolvedValue(reports);
    const { result } = renderHook(() => useActiveReports());

    await act(async () => {
      vi.advanceTimersByTime(0);
      await flushPromises();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.reports).toEqual(reports);
  });

  it('groups reports by lineId in reportsByLineId', async () => {
    const reports = [makeReport('r1', 'line-1'), makeReport('r2', 'line-1'), makeReport('r3', 'line-2')];
    mockGetActiveReports.mockResolvedValue(reports);
    const { result } = renderHook(() => useActiveReports());

    await act(async () => {
      vi.advanceTimersByTime(0);
      await flushPromises();
    });

    expect(result.current.reportsByLineId.get('line-1')).toHaveLength(2);
    expect(result.current.reportsByLineId.get('line-2')).toHaveLength(1);
  });

  it('groups reports by vehicleId in reportsByVehicleId', async () => {
    const reports = [makeReport('r1', 'line-1', 'v1'), makeReport('r2', 'line-2', 'v1')];
    mockGetActiveReports.mockResolvedValue(reports);
    const { result } = renderHook(() => useActiveReports());

    await act(async () => {
      vi.advanceTimersByTime(0);
      await flushPromises();
    });

    expect(result.current.reportsByVehicleId.get('v1')).toHaveLength(2);
  });

  it('excludes reports without vehicleId from reportsByVehicleId', async () => {
    const reports = [makeReport('r1', 'line-1')]; // no vehicleId → null
    mockGetActiveReports.mockResolvedValue(reports);
    const { result } = renderHook(() => useActiveReports());

    await act(async () => {
      vi.advanceTimersByTime(0);
      await flushPromises();
    });

    expect(result.current.reportsByVehicleId.size).toBe(0);
  });

  it('sets loading=false and keeps reports=[] on API error', async () => {
    mockGetActiveReports.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useActiveReports());

    await act(async () => {
      vi.advanceTimersByTime(0);
      await flushPromises();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.reports).toEqual([]);
  });

  it('refetches after POLL_INTERVAL_MS (30s)', async () => {
    mockGetActiveReports.mockResolvedValue([]);
    renderHook(() => useActiveReports());

    await act(async () => {
      vi.advanceTimersByTime(0);
      await flushPromises();
    });
    const callCount = mockGetActiveReports.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await flushPromises();
    });

    expect(mockGetActiveReports.mock.calls.length).toBeGreaterThan(callCount);
  });

  it('triggerReportsRefetch causes an additional fetch', async () => {
    mockGetActiveReports.mockResolvedValue([]);
    renderHook(() => useActiveReports());

    await act(async () => {
      vi.advanceTimersByTime(0);
      await flushPromises();
    });
    const callCount = mockGetActiveReports.mock.calls.length;

    await act(async () => {
      triggerReportsRefetch();
      await flushPromises();
    });

    expect(mockGetActiveReports.mock.calls.length).toBeGreaterThan(callCount);
  });

  it('cleans up interval and event listener on unmount', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    mockGetActiveReports.mockResolvedValue([]);
    const { unmount } = renderHook(() => useActiveReports());

    await act(async () => {
      vi.advanceTimersByTime(0);
      await flushPromises();
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'transitwatch:refetch-reports',
      expect.any(Function),
    );
  });
});
