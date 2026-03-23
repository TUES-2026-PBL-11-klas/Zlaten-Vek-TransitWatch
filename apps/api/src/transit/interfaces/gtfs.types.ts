export interface GtfsStop {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
}

export interface GtfsRoute {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: string;
  route_color?: string;
}

export interface GtfsTrip {
  trip_id: string;
  route_id: string;
  shape_id?: string;
  direction_id?: string;
}

export interface GtfsStopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: string;
}

export interface GtfsShape {
  shape_id: string;
  shape_pt_lat: string;
  shape_pt_lon: string;
  shape_pt_sequence: string;
}

export interface GtfsTranslation {
  table_name: string;
  field_name: string;
  record_id: string;
  language: string;
  translation: string;
}

// GTFS route_type mapping
// 0 = Tram, 1 = Metro, 2 = Rail, 3 = Bus, 11 = Trolleybus
export function gtfsRouteTypeToString(
  routeType: string,
): 'tram' | 'metro' | 'bus' | 'trolley' | 'rail' {
  switch (routeType) {
    case '0':
      return 'tram';
    case '1':
      return 'metro';
    case '2':
      return 'rail';
    case '3':
      return 'bus';
    case '11':
      return 'trolley';
    default:
      return 'bus';
  }
}

// Sofia bounding box for coordinate validation
export const SOFIA_BBOX = {
  minLat: 42.5,
  maxLat: 42.85,
  minLng: 23.15,
  maxLng: 23.55,
};

export function isValidSofiaCoord(lat: number, lng: number): boolean {
  return (
    lat >= SOFIA_BBOX.minLat &&
    lat <= SOFIA_BBOX.maxLat &&
    lng >= SOFIA_BBOX.minLng &&
    lng <= SOFIA_BBOX.maxLng
  );
}

export interface StopTimeEntry {
  tripId: string;
  stopGtfsId: string;
  arrivalTime: string; // HH:mm:ss (can be >24:00:00)
  departureTime: string;
  stopSequence: number;
}

// --- GTFS Realtime types ---

export interface VehiclePosition {
  vehicleId: string;
  tripId: string;
  routeGtfsId: string;
  lat: number;
  lng: number;
  bearing: number | null;
  speed: number | null;
  timestamp: number; // unix seconds when position was recorded
  updatedAt: number; // unix seconds when we received this update
}

export interface ArrivalInfo {
  lineName: string;
  lineType: string;
  lineColor: string | null;
  scheduledTime: string; // HH:mm
  estimatedTime: string; // HH:mm
  delayMinutes: number;
  minutesUntil: number;
  tripId: string;
}

/**
 * Parse a GTFS time string (HH:mm:ss, can be >24:00:00) to total seconds since midnight.
 */
export function parseGtfsTimeToSeconds(time: string): number {
  const [h, m, s] = time.split(':').map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

/**
 * Convert total seconds since midnight to HH:mm string.
 * Handles >24h by wrapping around.
 */
export function secondsToTimeString(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Get current time as GTFS seconds since midnight.
 * Before 04:00, adds 86400 to align with GTFS service day convention
 * (trips past midnight use times like 25:30:00).
 */
export function getCurrentGtfsSeconds(): number {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  let total = h * 3600 + m * 60 + s;
  if (h < 4) {
    total += 86400;
  }
  return total;
}

// --- Trip Timeline types ---

export interface TripTimelineStop {
  stopId: string;
  stopName: string;
  lat: number;
  lng: number;
  scheduledTime: string; // HH:mm
  estimatedTime: string; // HH:mm
  delayMinutes: number;
  status: 'passed' | 'next' | 'upcoming';
}

export interface TripTimeline {
  tripId: string;
  lineId: string;
  lineName: string;
  lineType: string;
  lineColor: string | null;
  stops: TripTimelineStop[];
}
