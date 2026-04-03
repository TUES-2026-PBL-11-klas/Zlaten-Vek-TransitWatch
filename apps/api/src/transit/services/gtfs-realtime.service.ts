import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { VehiclePosition, isValidSofiaCoord } from '../interfaces/gtfs.types';
import { GtfsStaticService } from './gtfs-static.service';

import * as GtfsRealtimeBindings from 'gtfs-realtime-bindings';

const VEHICLE_POSITIONS_URL =
  process.env.GTFS_VEHICLE_POSITIONS_URL ||
  'https://gtfs.sofiatraffic.bg/api/v1/vehicle-positions';

const TRIP_UPDATES_URL =
  process.env.GTFS_TRIP_UPDATES_URL ||
  'https://gtfs.sofiatraffic.bg/api/v1/trip-updates';

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export interface TripStopPrediction {
  arrivalTime: number; // absolute unix seconds
  departureTime: number; // absolute unix seconds
}

@Injectable()
export class GtfsRealtimeService {
  private readonly logger = new Logger(GtfsRealtimeService.name);

  // vehicleId → enriched position
  private vehicles = new Map<string, VehiclePosition>();
  // tripId → (stopGtfsId → prediction with absolute timestamps)
  private tripPredictions = new Map<string, Map<string, TripStopPrediction>>();
  // tripId → routeId from RT feed (for RT-only trip injection)
  private tripRouteIds = new Map<string, string>();

  constructor(private readonly gtfsStaticService: GtfsStaticService) {}

  @Interval(10000)
  async pollVehiclePositions() {
    try {
      const response = await fetch(VEHICLE_POSITIONS_URL);
      if (!response.ok) {
        this.logger.error(`Vehicle positions feed HTTP ${response.status}`);
        return;
      }

      const buffer = await response.arrayBuffer();
      const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer),
      );

      const now = Date.now();
      const routesMap = this.gtfsStaticService.getRoutesMap();
      const tripsMap = this.gtfsStaticService.getTripsMap();

      for (const entity of feed.entity) {
        const v = entity.vehicle;
        if (!v?.position || !v?.vehicle?.id) continue;

        const lat = v.position.latitude;
        const lng = v.position.longitude;
        if (!isValidSofiaCoord(lat, lng)) continue;

        // Convert timestamp (may be Long from protobuf)
        const ts = Number(v.timestamp || 0) * 1000;
        if (ts > 0 && now - ts > STALE_THRESHOLD_MS) continue;

        const tripId = v.trip?.tripId || '';
        const tripMeta = tripsMap.get(tripId);
        const routeGtfsId =
          v.trip?.routeId ||
          tripMeta?.routeId ||
          this.gtfsStaticService.getTripToRouteMap().get(tripId) ||
          '';

        // Enrich with route metadata from in-memory maps
        const routeMeta = routeGtfsId ? routesMap.get(routeGtfsId) : undefined;

        this.vehicles.set(v.vehicle.id, {
          vehicleId: v.vehicle.id,
          tripId,
          routeGtfsId,
          lat,
          lng,
          bearing: v.position.bearing ?? null,
          speed: v.position.speed ?? null,
          timestamp: Number(v.timestamp || 0),
          updatedAt: Math.floor(now / 1000),
          routeShortName: routeMeta?.shortName ?? null,
          routeType: routeMeta?.type ?? null,
          headsign: tripMeta?.headsign ?? null,
        });
      }

      // Remove stale vehicles not updated in this cycle
      for (const [id, pos] of this.vehicles) {
        if (now - pos.updatedAt * 1000 > STALE_THRESHOLD_MS) {
          this.vehicles.delete(id);
        }
      }

      this.logger.debug(`Tracking ${this.vehicles.size} vehicles`);
    } catch (error) {
      this.logger.error(
        `Failed to poll vehicle positions: ${(error as Error).message}`,
      );
    }
  }

  @Interval(15000)
  async pollTripUpdates() {
    try {
      const response = await fetch(TRIP_UPDATES_URL);
      if (!response.ok) {
        this.logger.error(`Trip updates feed HTTP ${response.status}`);
        return;
      }

      const buffer = await response.arrayBuffer();
      const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer),
      );

      this.tripPredictions.clear();
      this.tripRouteIds.clear();

      for (const entity of feed.entity) {
        const tu = entity.tripUpdate;
        if (!tu?.trip?.tripId || !tu?.stopTimeUpdate) continue;

        const tripId = tu.trip.tripId;

        // Store RT route ID for realtime-only trip injection
        if (tu.trip.routeId) {
          this.tripRouteIds.set(tripId, tu.trip.routeId);
        }

        const stopPredictions = new Map<string, TripStopPrediction>();
        for (const stu of tu.stopTimeUpdate) {
          if (stu.stopId) {
            const arrivalTime = Number(stu.arrival?.time ?? 0);
            const departureTime = Number(stu.departure?.time ?? 0);
            stopPredictions.set(stu.stopId, { arrivalTime, departureTime });
          }
        }

        if (stopPredictions.size > 0) {
          this.tripPredictions.set(tripId, stopPredictions);
        }
      }

      this.logger.debug(
        `Loaded predictions for ${this.tripPredictions.size} trips`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to poll trip updates: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get all vehicles, optionally filtered to those updated after `since` (unix seconds).
   */
  getVehicles(since?: number): VehiclePosition[] {
    const all = Array.from(this.vehicles.values());
    if (since) {
      return all.filter((v) => v.updatedAt > since);
    }
    return all;
  }

  /**
   * Get a single vehicle by ID.
   */
  getVehicleById(vehicleId: string): VehiclePosition | undefined {
    return this.vehicles.get(vehicleId);
  }

  /**
   * Get the absolute prediction for a specific trip at a specific stop.
   * Returns null if no realtime data is available.
   */
  getTripPrediction(
    tripId: string,
    stopGtfsId: string,
  ): TripStopPrediction | null {
    return this.tripPredictions.get(tripId)?.get(stopGtfsId) ?? null;
  }

  /**
   * Get all predictions for a trip (all stops).
   */
  getTripPredictions(
    tripId: string,
  ): Map<string, TripStopPrediction> | undefined {
    return this.tripPredictions.get(tripId);
  }

  /**
   * Get the RT route ID for a trip (from trip-updates feed).
   */
  getTripRouteId(tripId: string): string | undefined {
    return this.tripRouteIds.get(tripId);
  }

  /**
   * Get all trip predictions map (for RT-only trip injection in arrivals).
   */
  getAllTripPredictions(): Map<string, Map<string, TripStopPrediction>> {
    return this.tripPredictions;
  }

  /**
   * Get the realtime delay in seconds for a specific trip at a specific stop.
   * Computes from absolute prediction vs scheduled time. Returns 0 if no data.
   * @deprecated Use getTripPrediction() for absolute timestamps instead.
   */
  getTripDelay(tripId: string, stopGtfsId: string): number {
    const prediction = this.getTripPrediction(tripId, stopGtfsId);
    if (!prediction || prediction.arrivalTime === 0) return 0;
    // We can't compute delay without scheduled time here, return 0
    // The caller should use getTripPrediction() directly
    return 0;
  }
}
