import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserLocation } from './useUserLocation';

type SuccessCallback = (pos: GeolocationPosition) => void;
type ErrorCallback = (err: GeolocationPositionError) => void;

function makePosition(lat: number, lng: number, accuracy: number): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  };
}

function makeError(code: number): GeolocationPositionError {
  return {
    code,
    message: '',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

describe('useUserLocation', () => {
  let successCb: SuccessCallback | null = null;
  let errorCb: ErrorCallback | null = null;
  const watchId = 42;

  const mockGeolocation = {
    watchPosition: vi.fn((success: SuccessCallback, error: ErrorCallback) => {
      successCb = success;
      errorCb = error;
      return watchId;
    }),
    clearWatch: vi.fn(),
  };

  beforeEach(() => {
    successCb = null;
    errorCb = null;
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with location=null and error=null', () => {
    const { result } = renderHook(() => useUserLocation());
    expect(result.current.location).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('calls watchPosition when requestLocation is called', () => {
    const { result } = renderHook(() => useUserLocation());
    act(() => result.current.requestLocation());
    expect(mockGeolocation.watchPosition).toHaveBeenCalledTimes(1);
  });

  it('sets location on success callback', () => {
    const { result } = renderHook(() => useUserLocation());
    act(() => result.current.requestLocation());
    act(() => successCb!(makePosition(42.6977, 23.3219, 15)));
    expect(result.current.location).toEqual({ lat: 42.6977, lng: 23.3219, accuracy: 15 });
    expect(result.current.error).toBeNull();
  });

  it('sets Bulgarian error message for PERMISSION_DENIED', () => {
    const { result } = renderHook(() => useUserLocation());
    act(() => result.current.requestLocation());
    act(() => errorCb!(makeError(1)));
    expect(result.current.error).toBe('Достъпът до местоположението е отказан.');
  });

  it('sets Bulgarian error message for POSITION_UNAVAILABLE', () => {
    const { result } = renderHook(() => useUserLocation());
    act(() => result.current.requestLocation());
    act(() => errorCb!(makeError(2)));
    expect(result.current.error).toBe('Местоположението не е налично.');
  });

  it('sets Bulgarian error message for TIMEOUT (other codes)', () => {
    const { result } = renderHook(() => useUserLocation());
    act(() => result.current.requestLocation());
    act(() => errorCb!(makeError(3)));
    expect(result.current.error).toBe('Изтече времето за определяне на местоположението.');
  });

  it('sets error when geolocation is not supported', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    });
    const { result } = renderHook(() => useUserLocation());
    act(() => result.current.requestLocation());
    expect(result.current.error).toBe('Геолокацията не се поддържа от браузъра.');
  });

  it('calls clearWatch on unmount if watching', () => {
    const { result, unmount } = renderHook(() => useUserLocation());
    act(() => result.current.requestLocation());
    unmount();
    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(watchId);
  });
});
