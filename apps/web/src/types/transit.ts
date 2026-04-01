export type TransitType = 'bus' | 'tram' | 'metro' | 'trolley';

export interface TransitStop {
  id: string;
  gtfsId: string | null;
  name: string;
  lat: number;
  lng: number;
  lineCount: number;
  types: TransitType[];
}

export interface TransitLine {
  id: string;
  gtfsId: string | null;
  name: string;
  type: 'bus' | 'tram' | 'metro' | 'trolley';
  color: string | null;
}

export interface VehiclePosition {
  vehicleId: string;
  tripId: string;
  routeGtfsId: string;
  lat: number;
  lng: number;
  bearing: number | null;
  speed: number | null;
  timestamp: number;
  updatedAt: number;
}

export interface VehiclesResponse {
  timestamp: number;
  count: number;
  vehicles: VehiclePosition[];
}

export interface ArrivalInfo {
  lineName: string;
  lineType: string;
  lineColor: string | null;
  scheduledTime: string;
  estimatedTime: string;
  delayMinutes: number;
  minutesUntil: number;
  tripId: string;
}

export interface ArrivalsResponse {
  stopId: string;
  stopName: string;
  arrivals: ArrivalInfo[];
}

export interface TripTimelineStop {
  stopId: string;
  stopName: string;
  lat: number;
  lng: number;
  scheduledTime: string;
  estimatedTime: string;
  delayMinutes: number;
  minutesUntil: number;
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

export interface ShapeData {
  id: string;
  lineId: string;
  coordinates: [number, number][];
}

export const TRANSIT_COLORS: Record<string, string> = {
  bus: '#3B82F6',
  tram: '#EF4444',
  trolley: '#8B5CF6',
  metro: '#10B981',
};
