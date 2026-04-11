import type { VehiclePosition } from '../types/transit';

const EARTH_RADIUS_M = 6_371_000;

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface NearbyVehicleResult {
  vehicle: VehiclePosition;
  distance: number;
}

const SEARCH_RADII = [500, 1000, 2000];

export function findNearbyVehicles(
  userLat: number,
  userLng: number,
  vehicles: VehiclePosition[],
): { results: NearbyVehicleResult[]; radius: number } | null {
  for (const radius of SEARCH_RADII) {
    const found: NearbyVehicleResult[] = [];
    for (const vehicle of vehicles) {
      const distance = haversineDistance(userLat, userLng, vehicle.lat, vehicle.lng);
      if (distance <= radius) {
        found.push({ vehicle, distance });
      }
    }
    if (found.length > 0) {
      found.sort((a, b) => a.distance - b.distance);
      return { results: found, radius };
    }
  }
  return null;
}
