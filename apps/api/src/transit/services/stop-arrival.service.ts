import { Inject, Injectable, Logger } from '@nestjs/common';
import { GtfsStaticService } from './gtfs-static.service';
import {
  GtfsRealtimeService,
  TripStopPrediction,
} from './gtfs-realtime.service';
import {
  ITransitRepository,
  TRANSIT_REPOSITORY,
} from '../interfaces/transit-repository.interface';
import {
  ArrivalInfo,
  StopTimeEntry,
  TripTimeline,
  TripTimelineStop,
  getCurrentGtfsSeconds,
  parseGtfsTimeToSeconds,
  secondsToTimeString,
} from '../interfaces/gtfs.types';

const MAX_ARRIVALS = 10;
const ARRIVAL_WINDOW_SECONDS = 2 * 3600; // Look ahead 2 hours

@Injectable()
export class StopArrivalService {
  private readonly logger = new Logger(StopArrivalService.name);

  constructor(
    private readonly gtfsStaticService: GtfsStaticService,
    private readonly gtfsRealtimeService: GtfsRealtimeService,
    @Inject(TRANSIT_REPOSITORY)
    private readonly transitRepository: ITransitRepository,
  ) {}

  async getArrivals(stopId: string): Promise<ArrivalInfo[]> {
    // 1. Look up stop and find siblings (same stop_code = different platforms)
    const stop = await this.transitRepository.findStopById(stopId);
    if (!stop || !stop.gtfsId) return [];

    // Use in-memory stop_code index for sibling lookup
    const siblingGtfsIds = this.gtfsStaticService.getSiblingStopIds(
      stop.gtfsId,
    );

    // 2. Find all scheduled stop times at this stop and its siblings
    const stopToTrips = this.gtfsStaticService.getStopToTripsMap();
    const entries: StopTimeEntry[] = [];

    for (const gtfsId of siblingGtfsIds) {
      const stopEntries = stopToTrips.get(gtfsId);
      if (stopEntries) entries.push(...stopEntries);
    }

    const tripToRoute = this.gtfsStaticService.getTripToRouteMap();
    const routesMap = this.gtfsStaticService.getRoutesMap();
    const nowSeconds = getCurrentGtfsSeconds();
    const nowUnixSec = Math.floor(Date.now() / 1000);
    const windowEnd = nowSeconds + ARRIVAL_WINDOW_SECONDS;

    // 3. Collect candidate arrivals within the time window
    const candidates: Array<{
      routeGtfsId: string;
      scheduledSeconds: number;
      estimatedUnixSec: number | null; // absolute unix sec from RT, or null
      tripId: string;
      realtime: boolean;
    }> = [];

    for (const entry of entries) {
      if (!this.gtfsStaticService.isTripActiveToday(entry.tripId)) continue;

      const scheduledSeconds = parseGtfsTimeToSeconds(entry.arrivalTime);
      if (scheduledSeconds < nowSeconds || scheduledSeconds > windowEnd)
        continue;

      const routeGtfsId = tripToRoute.get(entry.tripId);
      if (!routeGtfsId) continue;

      // Check for absolute RT prediction
      const prediction = this.gtfsRealtimeService.getTripPrediction(
        entry.tripId,
        entry.stopGtfsId,
      );

      let estimatedUnixSec: number | null = null;
      let realtime = false;

      if (prediction && prediction.arrivalTime > 0) {
        estimatedUnixSec = prediction.arrivalTime;
        realtime = true;
        // Skip if already departed
        if (estimatedUnixSec < nowUnixSec) continue;
      } else {
        // Use scheduled time — skip if already passed
        const estimatedSeconds = scheduledSeconds;
        if (estimatedSeconds < nowSeconds) continue;
      }

      candidates.push({
        routeGtfsId,
        scheduledSeconds,
        estimatedUnixSec,
        tripId: entry.tripId,
        realtime,
      });
    }

    // 3b. Inject realtime-only trips (from RT feed but not in static data)
    const siblingSet = new Set(siblingGtfsIds);
    const existingTripIds = new Set(candidates.map((c) => c.tripId));
    const allPredictions = this.gtfsRealtimeService.getAllTripPredictions();

    for (const [tripId, stopPredictions] of allPredictions) {
      if (existingTripIds.has(tripId)) continue;

      for (const [stopGtfsId, pred] of stopPredictions) {
        if (!siblingSet.has(stopGtfsId)) continue;
        if (pred.arrivalTime <= nowUnixSec) continue;

        const routeGtfsId =
          this.gtfsRealtimeService.getTripRouteId(tripId) ||
          tripToRoute.get(tripId) ||
          '';
        if (!routeGtfsId || !routesMap.has(routeGtfsId)) continue;

        candidates.push({
          routeGtfsId,
          scheduledSeconds: 0, // no schedule for RT-only trips
          estimatedUnixSec: pred.arrivalTime,
          tripId,
          realtime: true,
        });
        break; // one prediction per trip is enough
      }
    }

    // 4. Sort by estimated arrival time
    candidates.sort((a, b) => {
      const aTime =
        a.estimatedUnixSec ??
        this.gtfsSecondsToApproxUnix(
          a.scheduledSeconds,
          nowUnixSec,
          nowSeconds,
        );
      const bTime =
        b.estimatedUnixSec ??
        this.gtfsSecondsToApproxUnix(
          b.scheduledSeconds,
          nowUnixSec,
          nowSeconds,
        );
      return aTime - bTime;
    });

    // 5. Deduplicate: keep only the next arrival per route
    const seenRoutes = new Set<string>();
    const unique = candidates.filter((c) => {
      if (seenRoutes.has(c.routeGtfsId)) return false;
      seenRoutes.add(c.routeGtfsId);
      return true;
    });

    // 6. Take top N and enrich with line info from in-memory maps
    const top = unique.slice(0, MAX_ARRIVALS);

    // 7. Build response
    return top
      .map((c) => {
        const routeMeta = routesMap.get(c.routeGtfsId);
        if (!routeMeta) return null;

        let minutesUntil: number;
        let estimatedTime: string;
        let delayMinutes = 0;

        if (c.estimatedUnixSec) {
          minutesUntil = Math.max(
            0,
            Math.round((c.estimatedUnixSec - nowUnixSec) / 60),
          );
          const d = new Date(c.estimatedUnixSec * 1000);
          estimatedTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          if (c.scheduledSeconds > 0) {
            const scheduledMinutes = Math.floor(c.scheduledSeconds / 60);
            const estDate = new Date(c.estimatedUnixSec * 1000);
            const estMinutes = estDate.getHours() * 60 + estDate.getMinutes();
            delayMinutes = estMinutes - (scheduledMinutes % (24 * 60));
          }
        } else {
          minutesUntil = Math.max(
            0,
            Math.round((c.scheduledSeconds - nowSeconds) / 60),
          );
          estimatedTime = secondsToTimeString(c.scheduledSeconds);
        }

        return {
          lineName: routeMeta.shortName,
          lineType: routeMeta.type,
          lineColor: routeMeta.color ?? null,
          scheduledTime:
            c.scheduledSeconds > 0
              ? secondsToTimeString(c.scheduledSeconds)
              : estimatedTime,
          estimatedTime,
          delayMinutes,
          minutesUntil,
          tripId: c.tripId,
        };
      })
      .filter((a): a is ArrivalInfo => a !== null);
  }

  /**
   * Get trip timeline by vehicle ID — the reliable approach.
   * Finds the vehicle, gets its current trip, resolves stop sequence.
   */
  async getVehicleTripTimeline(
    vehicleId: string,
  ): Promise<TripTimeline | null> {
    const vehicle = this.gtfsRealtimeService.getVehicleById(vehicleId);
    if (!vehicle || !vehicle.tripId) return null;

    const tripId = vehicle.tripId;
    const stopTimesMap = this.gtfsStaticService.getStopTimesMap();
    const tripToRouteMap = this.gtfsStaticService.getTripToRouteMap();
    const routesMap = this.gtfsStaticService.getRoutesMap();

    let stopTimes = stopTimesMap.get(tripId);
    let resolvedTripId = tripId;

    // If exact trip ID not found, try prefix matching
    if (!stopTimes || stopTimes.length === 0) {
      let prefix = tripId;
      while (prefix.includes('-')) {
        prefix = prefix.substring(0, prefix.lastIndexOf('-'));
        for (const [key, val] of stopTimesMap) {
          if (
            key.startsWith(prefix + '-') &&
            this.gtfsStaticService.isTripActiveToday(key)
          ) {
            stopTimes = val;
            resolvedTripId = key;
            break;
          }
        }
        if (stopTimes && stopTimes.length > 0) break;
      }
    }

    // Last resort: find any active trip on the same route
    if (!stopTimes || stopTimes.length === 0) {
      const routeGtfsId = vehicle.routeGtfsId;
      if (routeGtfsId) {
        for (const [key, val] of stopTimesMap) {
          if (
            tripToRouteMap.get(key) === routeGtfsId &&
            this.gtfsStaticService.isTripActiveToday(key)
          ) {
            stopTimes = val;
            resolvedTripId = key;
            break;
          }
        }
      }
    }

    if (!stopTimes || stopTimes.length === 0) return null;

    const resolvedRouteGtfsId = tripToRouteMap.get(resolvedTripId);
    if (!resolvedRouteGtfsId) return null;

    const routeMeta = routesMap.get(resolvedRouteGtfsId);

    // Also look up DB line for lineId (needed for shape fetching)
    const line =
      await this.transitRepository.findLineByGtfsId(resolvedRouteGtfsId);
    if (!line) return null;

    const nowUnixSec = Math.floor(Date.now() / 1000);
    const nowGtfsSeconds = getCurrentGtfsSeconds();

    // Get all predictions for this trip at once, preferring resolvedTripId
    const predictions: Map<string, TripStopPrediction> =
      this.gtfsRealtimeService.getTripPredictions(resolvedTripId) ??
      this.gtfsRealtimeService.getTripPredictions(tripId) ??
      new Map<string, TripStopPrediction>();

    const stops: TripTimelineStop[] = [];
    let foundNext = false;

    for (const entry of stopTimes) {
      const stop = await this.transitRepository.findStopByGtfsId(
        entry.stopGtfsId,
      );
      if (!stop) continue;

      const scheduledSeconds = parseGtfsTimeToSeconds(entry.arrivalTime);
      const prediction = predictions.get(entry.stopGtfsId);

      let estimatedTime: string;
      let delayMinutes = 0;
      let minutesUntil: number;
      let status: 'passed' | 'next' | 'upcoming';

      if (prediction && prediction.arrivalTime > 0) {
        // Use absolute RT prediction
        const d = new Date(prediction.arrivalTime * 1000);
        estimatedTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        if (prediction.arrivalTime <= nowUnixSec) {
          status = 'passed';
          minutesUntil = 0;
        } else if (!foundNext) {
          status = 'next';
          foundNext = true;
          minutesUntil = Math.max(
            0,
            Math.round((prediction.arrivalTime - nowUnixSec) / 60),
          );
        } else {
          status = 'upcoming';
          minutesUntil = Math.max(
            0,
            Math.round((prediction.arrivalTime - nowUnixSec) / 60),
          );
        }

        // Compute delay from scheduled
        const scheduledNormMinutes =
          Math.floor(scheduledSeconds / 60) % (24 * 60);
        const predMinutes = d.getHours() * 60 + d.getMinutes();
        delayMinutes = predMinutes - scheduledNormMinutes;
      } else {
        // Fall back to scheduled time
        estimatedTime = secondsToTimeString(scheduledSeconds);

        if (scheduledSeconds < nowGtfsSeconds) {
          status = 'passed';
          minutesUntil = 0;
        } else if (!foundNext) {
          status = 'next';
          foundNext = true;
          minutesUntil = Math.max(
            0,
            Math.round((scheduledSeconds - nowGtfsSeconds) / 60),
          );
        } else {
          status = 'upcoming';
          minutesUntil = Math.max(
            0,
            Math.round((scheduledSeconds - nowGtfsSeconds) / 60),
          );
        }
      }

      stops.push({
        stopId: stop.id,
        stopName: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        scheduledTime: secondsToTimeString(scheduledSeconds),
        estimatedTime,
        delayMinutes,
        minutesUntil,
        status,
      });
    }

    return {
      tripId,
      lineId: line.id,
      lineName: routeMeta?.shortName ?? line.name,
      lineType: routeMeta?.type ?? line.type,
      lineColor: routeMeta?.color ?? line.color,
      stops,
    };
  }

  /**
   * Get trip timeline by trip ID (legacy endpoint, kept for backward compat).
   */
  async getTripTimeline(
    tripId: string,
    routeGtfsId?: string,
  ): Promise<TripTimeline | null> {
    const stopTimesMap = this.gtfsStaticService.getStopTimesMap();
    const tripToRouteMap = this.gtfsStaticService.getTripToRouteMap();

    let stopTimes = stopTimesMap.get(tripId);
    let resolvedTripId = tripId;

    // Prefix matching fallback
    if (!stopTimes || stopTimes.length === 0) {
      let prefix = tripId;
      while (prefix.includes('-')) {
        prefix = prefix.substring(0, prefix.lastIndexOf('-'));
        for (const [key, val] of stopTimesMap) {
          if (
            key.startsWith(prefix + '-') &&
            this.gtfsStaticService.isTripActiveToday(key)
          ) {
            stopTimes = val;
            resolvedTripId = key;
            break;
          }
        }
        if (stopTimes && stopTimes.length > 0) break;
      }
    }

    // Last resort: find any active trip on the same route
    if ((!stopTimes || stopTimes.length === 0) && routeGtfsId) {
      for (const [key, val] of stopTimesMap) {
        if (
          tripToRouteMap.get(key) === routeGtfsId &&
          this.gtfsStaticService.isTripActiveToday(key)
        ) {
          stopTimes = val;
          resolvedTripId = key;
          break;
        }
      }
    }

    if (!stopTimes || stopTimes.length === 0) return null;

    const resolvedRouteGtfsId = tripToRouteMap.get(resolvedTripId);
    if (!resolvedRouteGtfsId) return null;

    const routesMap = this.gtfsStaticService.getRoutesMap();
    const routeMeta = routesMap.get(resolvedRouteGtfsId);
    const line =
      await this.transitRepository.findLineByGtfsId(resolvedRouteGtfsId);
    if (!line) return null;

    const nowUnixSec = Math.floor(Date.now() / 1000);
    const nowGtfsSeconds = getCurrentGtfsSeconds();
    const predictions: Map<string, TripStopPrediction> =
      this.gtfsRealtimeService.getTripPredictions(resolvedTripId) ??
      this.gtfsRealtimeService.getTripPredictions(tripId) ??
      new Map<string, TripStopPrediction>();

    const stops: TripTimelineStop[] = [];
    let foundNext = false;

    for (const entry of stopTimes) {
      const stop = await this.transitRepository.findStopByGtfsId(
        entry.stopGtfsId,
      );
      if (!stop) continue;

      const scheduledSeconds = parseGtfsTimeToSeconds(entry.arrivalTime);
      const prediction = predictions.get(entry.stopGtfsId);

      let estimatedTime: string;
      let delayMinutes = 0;
      let minutesUntil: number;
      let status: 'passed' | 'next' | 'upcoming';

      if (prediction && prediction.arrivalTime > 0) {
        const d = new Date(prediction.arrivalTime * 1000);
        estimatedTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        if (prediction.arrivalTime <= nowUnixSec) {
          status = 'passed';
          minutesUntil = 0;
        } else if (!foundNext) {
          status = 'next';
          foundNext = true;
          minutesUntil = Math.max(
            0,
            Math.round((prediction.arrivalTime - nowUnixSec) / 60),
          );
        } else {
          status = 'upcoming';
          minutesUntil = Math.max(
            0,
            Math.round((prediction.arrivalTime - nowUnixSec) / 60),
          );
        }

        const scheduledNormMinutes =
          Math.floor(scheduledSeconds / 60) % (24 * 60);
        const predMinutes = d.getHours() * 60 + d.getMinutes();
        delayMinutes = predMinutes - scheduledNormMinutes;
      } else {
        estimatedTime = secondsToTimeString(scheduledSeconds);

        if (scheduledSeconds < nowGtfsSeconds) {
          status = 'passed';
          minutesUntil = 0;
        } else if (!foundNext) {
          status = 'next';
          foundNext = true;
          minutesUntil = Math.max(
            0,
            Math.round((scheduledSeconds - nowGtfsSeconds) / 60),
          );
        } else {
          status = 'upcoming';
          minutesUntil = Math.max(
            0,
            Math.round((scheduledSeconds - nowGtfsSeconds) / 60),
          );
        }
      }

      stops.push({
        stopId: stop.id,
        stopName: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        scheduledTime: secondsToTimeString(scheduledSeconds),
        estimatedTime,
        delayMinutes,
        minutesUntil,
        status,
      });
    }

    return {
      tripId,
      lineId: line.id,
      lineName: routeMeta?.shortName ?? line.name,
      lineType: routeMeta?.type ?? line.type,
      lineColor: routeMeta?.color ?? line.color,
      stops,
    };
  }

  /** Convert GTFS seconds-since-midnight to approximate unix seconds */
  private gtfsSecondsToApproxUnix(
    gtfsSeconds: number,
    nowUnixSec: number,
    nowGtfsSeconds: number,
  ): number {
    return nowUnixSec + (gtfsSeconds - nowGtfsSeconds);
  }
}
