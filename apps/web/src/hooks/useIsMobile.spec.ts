import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './useIsMobile';

type ChangeHandler = (e: MediaQueryListEvent) => void;

function createMockMql(matches: boolean) {
  const listeners: ChangeHandler[] = [];
  return {
    matches,
    addEventListener: vi.fn((_event: string, handler: ChangeHandler) => {
      listeners.push(handler);
    }),
    removeEventListener: vi.fn((_event: string, handler: ChangeHandler) => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    dispatchChange(newMatches: boolean) {
      listeners.forEach((h) => h({ matches: newMatches } as MediaQueryListEvent));
    },
  };
}

describe('useIsMobile', () => {
  let mockMql: ReturnType<typeof createMockMql>;

  beforeEach(() => {
    mockMql = createMockMql(false);
    vi.stubGlobal('window', {
      ...window,
      matchMedia: vi.fn(() => mockMql),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when matchMedia reports non-mobile', () => {
    mockMql = createMockMql(false);
    vi.stubGlobal('window', { ...window, matchMedia: vi.fn(() => mockMql) });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true when matchMedia reports mobile', () => {
    mockMql = createMockMql(true);
    vi.stubGlobal('window', { ...window, matchMedia: vi.fn(() => mockMql) });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('registers a change event listener on mount', () => {
    renderHook(() => useIsMobile());
    expect(mockMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes the change event listener on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('updates to true when a change event fires with matches=true', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => {
      mockMql.dispatchChange(true);
    });
    expect(result.current).toBe(true);
  });

  it('updates to false when a change event fires with matches=false', () => {
    mockMql = createMockMql(true);
    vi.stubGlobal('window', { ...window, matchMedia: vi.fn(() => mockMql) });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    act(() => {
      mockMql.dispatchChange(false);
    });
    expect(result.current).toBe(false);
  });
});
