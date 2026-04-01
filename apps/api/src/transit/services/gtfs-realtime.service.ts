import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { VehiclePosition, isValidSofiaCoord } from '../interfaces/gtfs.types';

import * as GtfsRealtimeBindings from 'gtfs-realtime-bindings';

const VEHICLE_POSITIONS_URL =
  process.env.GTFS_VEHICLE_POSITIONS_URL ||
  'https://gtfs.sofiatraffic.bg/api/v1/vehicle-positions';

const TRIP_UPDATES_URL =
  process.env.GTFS_TRIP_UPDATES_URL ||
  'https://gtfs.sofiatraffic.bg/api/v1/trip-updates';

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class GtfsRealtimeService {
  private readonly logger = new Logger(GtfsRealtimeService.name);

  // vehicleId → position
  private vehicles = new Map<string, VehiclePosition>();
  // tripId → (stopGtfsId → delay in seconds)
  private tripDelays = new Map<string, Map<string, number>>();

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

      for (const entity of feed.entity) {
        const v = entity.vehicle;
        if (!v?.position || !v?.vehicle?.id) continue;

        const lat = v.position.latitude;
        const lng = v.position.longitude;
        if (!isValidSofiaCoord(lat, lng)) continue;

        // Convert timestamp (may be Long from protobuf)
        const ts = Number(v.timestamp || 0) * 1000;
        if (ts > 0 && now - ts > STALE_THRESHOLD_MS) continue;

        this.vehicles.set(v.vehicle.id, {
          vehicleId: v.vehicle.id,
          tripId: v.trip?.tripId || '',
          routeGtfsId: v.trip?.routeId || '',
          lat,
          lng,
          bearing: v.position.bearing ?? null,
          speed: v.position.speed ?? null,
          timestamp: Number(v.timestamp || 0),
          updatedAt: Math.floor(now / 1000),
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

      this.tripDelays.clear();

      for (const entity of feed.entity) {
        const tu = entity.tripUpdate;
        if (!tu?.trip?.tripId || !tu?.stopTimeUpdate) continue;

        const stopDelays = new Map<string, number>();
        for (const stu of tu.stopTimeUpdate) {
          if (stu.stopId) {
            const delay = Number(
              stu.arrival?.delay ?? stu.departure?.delay ?? 0,
            );
            stopDelays.set(stu.stopId, delay);
          }
        }

        if (stopDelays.size > 0) {
          this.tripDelays.set(tu.trip.tripId, stopDelays);
        }
      }

      this.logger.debug(`Loaded delays for ${this.tripDelays.size} trips`);
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
   * Get the realtime delay in seconds for a specific trip at a specific stop.
   * Returns 0 if no realtime data is available.
   */
  getTripDelay(tripId: string, stopGtfsId: string): number {
    return this.tripDelays.get(tripId)?.get(stopGtfsId) ?? 0;
  }
}
