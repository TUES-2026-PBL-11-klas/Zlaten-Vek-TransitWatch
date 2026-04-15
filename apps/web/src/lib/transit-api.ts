import api from './api';
import type {
  TransitStop,
  TransitLine,
  VehiclesResponse,
  ArrivalsResponse,
  TripTimeline,
  ShapeData,
  ActiveReport,
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

  getTripTimeline: (tripId: string, routeGtfsId?: string) =>
    api
      .get<TripTimeline>(`/transit/trips/${tripId}/timeline`, {
        params: routeGtfsId ? { route: routeGtfsId } : {},
      })
      .then((r) => r.data),

  getVehicleTripTimeline: (vehicleId: string) =>
    api
      .get<TripTimeline>(`/transit/vehicles/${vehicleId}/trip`)
      .then((r) => r.data),

  getActiveReports: () =>
    api.get<ActiveReport[]>('/reports/active').then((r) => r.data),

  getMyReports: () =>
    api.get<ActiveReport[]>('/reports/mine').then((r) => r.data),

  createReport: (data: {
    lineId: string;
    vehicleId?: string;
    category: string;
    description?: string;
    photoUrl?: string;
  }) => api.post<ActiveReport>('/reports', data).then((r) => r.data),

  deleteReport: (id: string) =>
    api.delete(`/reports/${id}`),

  getMe: () =>
    api
      .get<{ id: string; email: string; credibilityScore: number; createdAt: string }>(
        '/auth/me',
      )
      .then((r) => r.data),

  voteOnReport: (reportId: string, type: 'confirm' | 'dispute') =>
    api
      .post<{ vote: { id: string; type: string }; authorScore: number }>(
        `/reports/${reportId}/votes`,
        { type },
      )
      .then((r) => r.data),
};
