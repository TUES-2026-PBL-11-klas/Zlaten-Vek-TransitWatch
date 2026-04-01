import { Inject, Injectable } from '@nestjs/common';
import { GtfsStaticService } from './gtfs-static.service';
import { GtfsRealtimeService } from './gtfs-realtime.service';
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

    // Use in-memory stop_code index for sibling lookup (more reliable than DB)
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

    if (entries.length === 0) return [];

    const tripToRoute = this.gtfsStaticService.getTripToRouteMap();
    const nowSeconds = getCurrentGtfsSeconds();
    const windowEnd = nowSeconds + ARRIVAL_WINDOW_SECONDS;

    // 3. Collect candidate arrivals within the time window
    const candidates: Array<{
      routeGtfsId: string;
      scheduledSeconds: number;
      delaySeconds: number;
      tripId: string;
    }> = [];

    for (const entry of entries) {
      // Only include trips that run today (service calendar filtering)
      if (!this.gtfsStaticService.isTripActiveToday(entry.tripId)) continue;

      const scheduledSeconds = parseGtfsTimeToSeconds(entry.arrivalTime);

      // Only include arrivals within the lookahead window
      if (scheduledSeconds < nowSeconds || scheduledSeconds > windowEnd)
        continue;

      const routeGtfsId = tripToRoute.get(entry.tripId);
      if (!routeGtfsId) continue;

      const delaySeconds = this.gtfsRealtimeService.getTripDelay(
        entry.tripId,
        entry.stopGtfsId,
      );

      const estimatedSeconds = scheduledSeconds + delaySeconds;

      // Skip if already passed (accounting for delay)
      if (estimatedSeconds < nowSeconds) continue;

      candidates.push({
        routeGtfsId,
        scheduledSeconds,
        delaySeconds,
        tripId: entry.tripId,
      });
    }

    // 4. Sort by estimated arrival time
    candidates.sort(
      (a, b) =>
        a.scheduledSeconds +
        a.delaySeconds -
        (b.scheduledSeconds + b.delaySeconds),
    );

    // 5. Deduplicate: keep only the next arrival per route
    //    (avoids showing 20 entries for the same bus line)
    const seenRoutes = new Set<string>();
    const unique = candidates.filter((c) => {
      if (seenRoutes.has(c.routeGtfsId)) return false;
      seenRoutes.add(c.routeGtfsId);
      return true;
    });

    // 6. Take top N and enrich with line info
    const top = unique.slice(0, MAX_ARRIVALS);

    // Batch-resolve unique route IDs
    const routeGtfsIds = [...new Set(top.map((c) => c.routeGtfsId))];
    const lineMap = new Map<
      string,
      { name: string; type: string; color: string | null }
    >();
    for (const gtfsId of routeGtfsIds) {
      const line = await this.transitRepository.findLineByGtfsId(gtfsId);
      if (line) {
        lineMap.set(gtfsId, {
          name: line.name,
          type: line.type,
          color: line.color,
        });
      }
    }

    // 7. Build response
    return top
      .map((c) => {
        const line = lineMap.get(c.routeGtfsId);
        if (!line) return null;

        const estimatedSeconds = c.scheduledSeconds + c.delaySeconds;
        const minutesUntil = Math.max(
          0,
          Math.round((estimatedSeconds - nowSeconds) / 60),
        );

        return {
          lineName: line.name,
          lineType: line.type,
          lineColor: line.color,
          scheduledTime: secondsToTimeString(c.scheduledSeconds),
          estimatedTime: secondsToTimeString(estimatedSeconds),
          delayMinutes: Math.round(c.delaySeconds / 60),
          minutesUntil,
          tripId: c.tripId,
        };
      })
      .filter((a): a is ArrivalInfo => a !== null);
  }

  async getTripTimeline(tripId: string): Promise<TripTimeline | null> {
    const stopTimesMap = this.gtfsStaticService.getStopTimesMap();
    const tripToRouteMap = this.gtfsStaticService.getTripToRouteMap();

    let stopTimes = stopTimesMap.get(tripId);
    let resolvedTripId = tripId;

    // Realtime trip IDs use a different service_id suffix than the static GTFS
    // (e.g. realtime "A26-A4261-5-12-17194476341" vs static "A26-A4261-5-12-20315579490").
    // Fall back to prefix-based matching by stripping the last "-{serviceId}" segment.
    if ((!stopTimes || stopTimes.length === 0) && tripId.includes('-')) {
      const prefix = tripId.substring(0, tripId.lastIndexOf('-'));
      for (const [key, val] of stopTimesMap) {
        if (key.startsWith(prefix + '-')) {
          stopTimes = val;
          resolvedTripId = key;
          break;
        }
      }
    }

    if (!stopTimes || stopTimes.length === 0) return null;

    const routeGtfsId = tripToRouteMap.get(resolvedTripId);
    if (!routeGtfsId) return null;

    const line = await this.transitRepository.findLineByGtfsId(routeGtfsId);
    if (!line) return null;

    const nowSeconds = getCurrentGtfsSeconds();
    const stops: TripTimelineStop[] = [];
    let foundNext = false;

    for (const entry of stopTimes) {
      const stop = await this.transitRepository.findStopByGtfsId(
        entry.stopGtfsId,
      );
      if (!stop) continue;

      const scheduledSeconds = parseGtfsTimeToSeconds(entry.arrivalTime);
      const delaySeconds = this.gtfsRealtimeService.getTripDelay(
        tripId,
        entry.stopGtfsId,
      );
      const estimatedSeconds = scheduledSeconds + delaySeconds;

      let status: 'passed' | 'next' | 'upcoming';
      if (estimatedSeconds < nowSeconds) {
        status = 'passed';
      } else if (!foundNext) {
        status = 'next';
        foundNext = true;
      } else {
        status = 'upcoming';
      }

      stops.push({
        stopId: stop.id,
        stopName: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        scheduledTime: secondsToTimeString(scheduledSeconds),
        estimatedTime: secondsToTimeString(estimatedSeconds),
        delayMinutes: Math.round(delaySeconds / 60),
        minutesUntil: Math.max(
          0,
          Math.round((estimatedSeconds - nowSeconds) / 60),
        ),
        status,
      });
    }

    return {
      tripId,
      lineId: line.id,
      lineName: line.name,
      lineType: line.type,
      lineColor: line.color,
      stops,
    };
  }
}
