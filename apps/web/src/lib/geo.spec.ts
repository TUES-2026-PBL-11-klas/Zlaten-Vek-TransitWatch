import { describe, it, expect } from 'vitest';
import { haversineDistance, findNearbyVehicles } from './geo';
import type { VehiclePosition } from '../types/transit';

function makeVehicle(id: string, lat: number, lng: number): VehiclePosition {
  return {
    vehicleId: id,
    tripId: 'trip-1',
    routeGtfsId: 'route-1',
    lat,
    lng,
    bearing: null,
    speed: null,
    timestamp: 0,
    updatedAt: 0,
    routeShortName: null,
    routeType: null,
    headsign: null,
  };
}

// Sofia city center reference
const SOFIA_LAT = 42.6977;
const SOFIA_LNG = 23.3219;

describe('haversineDistance', () => {
  it('returns 0 for the same point', () => {
    expect(haversineDistance(SOFIA_LAT, SOFIA_LNG, SOFIA_LAT, SOFIA_LNG)).toBe(0);
  });

  it('returns approximately 1000 m for ~1 km north', () => {
    // ~0.009 degrees latitude ≈ 1 km
    const distance = haversineDistance(SOFIA_LAT, SOFIA_LNG, SOFIA_LAT + 0.009, SOFIA_LNG);
    expect(distance).toBeGreaterThan(950);
    expect(distance).toBeLessThan(1050);
  });

  it('is symmetric: d(A,B) === d(B,A)', () => {
    const d1 = haversineDistance(42.6, 23.3, 42.7, 23.4);
    const d2 = haversineDistance(42.7, 23.4, 42.6, 23.3);
    expect(d1).toBeCloseTo(d2, 5);
  });

  it('returns a positive value for distinct points', () => {
    expect(haversineDistance(42.6, 23.3, 42.7, 23.4)).toBeGreaterThan(0);
  });
});

describe('findNearbyVehicles', () => {
  it('returns null for an empty vehicles array', () => {
    expect(findNearbyVehicles(SOFIA_LAT, SOFIA_LNG, [])).toBeNull();
  });

  it('returns null when all vehicles are beyond 2000 m', () => {
    // ~0.1 degrees ≈ 11 km
    const farVehicle = makeVehicle('v1', SOFIA_LAT + 0.1, SOFIA_LNG + 0.1);
    expect(findNearbyVehicles(SOFIA_LAT, SOFIA_LNG, [farVehicle])).toBeNull();
  });

  it('returns radius 500 for a vehicle at ~400 m', () => {
    // ~0.0036 degrees lat ≈ 400 m
    const vehicle = makeVehicle('v1', SOFIA_LAT + 0.0036, SOFIA_LNG);
    const result = findNearbyVehicles(SOFIA_LAT, SOFIA_LNG, [vehicle]);
    expect(result).not.toBeNull();
    expect(result!.radius).toBe(500);
    expect(result!.results).toHaveLength(1);
  });

  it('escalates to radius 1000 when closest vehicle is ~800 m away', () => {
    // ~0.0072 degrees lat ≈ 800 m (outside 500 m, inside 1000 m)
    const vehicle = makeVehicle('v1', SOFIA_LAT + 0.0072, SOFIA_LNG);
    const result = findNearbyVehicles(SOFIA_LAT, SOFIA_LNG, [vehicle]);
    expect(result).not.toBeNull();
    expect(result!.radius).toBe(1000);
  });

  it('escalates to radius 2000 when closest vehicle is ~1500 m away', () => {
    // ~0.0135 degrees lat ≈ 1500 m (outside 1000 m, inside 2000 m)
    const vehicle = makeVehicle('v1', SOFIA_LAT + 0.0135, SOFIA_LNG);
    const result = findNearbyVehicles(SOFIA_LAT, SOFIA_LNG, [vehicle]);
    expect(result).not.toBeNull();
    expect(result!.radius).toBe(2000);
  });

  it('excludes a vehicle just beyond 2000 m even at max radius', () => {
    // ~0.018 degrees lat ≈ 2000 m; use 0.022 ≈ 2450 m to ensure exclusion
    const farVehicle = makeVehicle('v1', SOFIA_LAT + 0.022, SOFIA_LNG);
    expect(findNearbyVehicles(SOFIA_LAT, SOFIA_LNG, [farVehicle])).toBeNull();
  });

  it('sorts results ascending by distance', () => {
    const near = makeVehicle('v1', SOFIA_LAT + 0.001, SOFIA_LNG);  // ~110 m
    const far = makeVehicle('v2', SOFIA_LAT + 0.003, SOFIA_LNG);   // ~330 m
    const result = findNearbyVehicles(SOFIA_LAT, SOFIA_LNG, [far, near]);
    expect(result).not.toBeNull();
    expect(result!.results[0].vehicle.vehicleId).toBe('v1');
    expect(result!.results[1].vehicle.vehicleId).toBe('v2');
    expect(result!.results[0].distance).toBeLessThan(result!.results[1].distance);
  });

  it('returns all vehicles within the matched radius', () => {
    const v1 = makeVehicle('v1', SOFIA_LAT + 0.001, SOFIA_LNG);
    const v2 = makeVehicle('v2', SOFIA_LAT + 0.002, SOFIA_LNG);
    const result = findNearbyVehicles(SOFIA_LAT, SOFIA_LNG, [v1, v2]);
    expect(result!.results).toHaveLength(2);
  });

  it('returns distance in meters as a number', () => {
    const vehicle = makeVehicle('v1', SOFIA_LAT + 0.001, SOFIA_LNG);
    const result = findNearbyVehicles(SOFIA_LAT, SOFIA_LNG, [vehicle]);
    expect(typeof result!.results[0].distance).toBe('number');
    expect(result!.results[0].distance).toBeGreaterThan(0);
  });
});
