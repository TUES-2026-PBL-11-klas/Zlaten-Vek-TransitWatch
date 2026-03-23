import api from './api';
import type {
  TransitStop,
  TransitLine,
  VehiclesResponse,
  ArrivalsResponse,
  TripTimeline,
  ShapeData,
} from '../types/transit';

export const transitApi = {
  getStopsByBbox: (bbox: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  }) =>
    api
      .get<TransitStop[]>('/transit/stops', {
        params: {
          bbox: `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`,
        },
      })
      .then((r) => r.data),

  getStopArrivals: (stopId: string) =>
    api
      .get<ArrivalsResponse>(`/transit/stops/${stopId}/arrivals`)
      .then((r) => r.data),

  getAllLines: () =>
    api.get<TransitLine[]>('/transit/lines').then((r) => r.data),

  getLineShape: (lineId: string) =>
    api
      .get<ShapeData>(`/transit/lines/${lineId}/shape`)
      .then((r) => r.data),

  getVehicles: (since?: number) =>
    api
      .get<VehiclesResponse>('/transit/vehicles', {
        params: since ? { since } : {},
      })
      .then((r) => r.data),

  getTripTimeline: (tripId: string) =>
    api
      .get<TripTimeline>(`/transit/trips/${tripId}/timeline`)
      .then((r) => r.data),
};
