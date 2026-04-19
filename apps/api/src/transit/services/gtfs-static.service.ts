import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import AdmZip from 'adm-zip';
import { parseGtfsCsv } from '../utils/gtfs-parser';
import { DisposableTimer } from '../../metrics/disposable-timer';
import { simplifyPolyline } from '../utils/polyline-simplifier';
import {
  GtfsStop,
  GtfsRoute,
  GtfsTrip,
  GtfsStopTime,
  GtfsShape,
  GtfsTranslation,
  GtfsCalendarDate,
  gtfsRouteTypeToString,
  isValidSofiaCoord,
  StopTimeEntry,
} from '../interfaces/gtfs.types';
import {
  ITransitRepository,
  TRANSIT_REPOSITORY,
} from '../interfaces/transit-repository.interface';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';

const GTFS_STATIC_URL =
  process.env.GTFS_STATIC_URL || 'https://gtfs.sofiatraffic.bg/api/v1/static';

const POLYLINE_EPSILON = 0.0001; // ~11 meters at Sofia's latitude

@Injectable()
export class GtfsStaticService implements OnModuleInit {
  private readonly logger = new Logger(GtfsStaticService.name);

  // In-memory lookup tables populated during import
  private stopTimesMap = new Map<string, StopTimeEntry[]>();
  private stopToTripsMap = new Map<string, StopTimeEntry[]>(); // reverse index: stopGtfsId → entries
  private tripToRouteMap = new Map<string, string>();
  private tripToShapeMap = new Map<string, string>();
  private tripServiceMap = new Map<string, string>(); // tripId → serviceId
  private stopsByCode = new Map<string, string[]>(); // stop_code → [stopGtfsIds]
  private stopIdToCode = new Map<string, string>(); // stopGtfsId → stop_code

  // In-memory route & trip metadata for fast enrichment (no DB queries)
  private routesMap = new Map<
    string,
    { routeId: string; shortName: string; type: string; color?: string }
  >();
  private tripsMap = new Map<
    string,
    {
      tripId: string;
      routeId: string;
      serviceId: string;
      headsign: string;
    }
  >();

  // Raw calendar dates for on-the-fly service ID computation
  private calendarDatesRaw: GtfsCalendarDate[] = [];
  private cachedActiveServices: Set<string> | null = null;
  private cachedDateStr = '';

  constructor(
    @Inject(TRANSIT_REPOSITORY)
    private readonly transitRepository: ITransitRepository,
    @InjectMetric('gtfs_import_duration_seconds')
    private readonly importDurationHistogram: Histogram,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.transitRepository.countStopsWithGtfsId();
      if (count === 0) {
        this.logger.log(
          'No GTFS stops found in database. Starting initial import...',
        );
        await this.importStaticData();
      } else {
        this.logger.log(
          `Found ${count} GTFS stops in database. Skipping initial import.`,
        );
        // Still load stop_times into memory for arrival calculations
        await this.loadStopTimesFromGtfs();
      }
    } catch (error) {
      this.logger.warn(
        `Database unreachable on startup — skipping GTFS init: ${(error as Error).message}`,
      );
    }
  }

  @Cron('0 3 * * *') // Daily at 3 AM
  async scheduledImport() {
    this.logger.log('Starting scheduled GTFS static data import...');
    await this.importStaticData();
  }

  async importStaticData(): Promise<{
    stops: number;
    lines: number;
    shapes: number;
  }> {
    const timer = new DisposableTimer(this.importDurationHistogram);

    try {
      this.logger.log(
        `Downloading GTFS static feed from ${GTFS_STATIC_URL}...`,
      );

      let zipBuffer: Buffer;
      try {
        const response = await fetch(GTFS_STATIC_URL);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        zipBuffer = Buffer.from(await response.arrayBuffer());
      } catch (error) {
        this.logger.error(
          `Failed to download GTFS feed: ${(error as Error).message}`,
        );
        throw error;
      }

      this.logger.log(
        `Downloaded ${(zipBuffer.length / 1024 / 1024).toFixed(1)} MB. Extracting...`,
      );
      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();

      const files = new Map<string, string>();
      for (const entry of entries) {
        files.set(entry.entryName, entry.getData().toString('utf-8'));
      }

      // Parse translations first (for Bulgarian names)
      const translations = this.parseTranslations(
        files.get('translations.txt'),
      );

      // 1. Import stops
      const stopsImported = await this.importStops(
        files.get('stops.txt'),
        translations,
      );

      // 2. Import routes (lines)
      const linesImported = await this.importRoutes(
        files.get('routes.txt'),
        translations,
      );

      // 3. Parse trips (in-memory mapping)
      this.parseTrips(files.get('trips.txt'));

      // 3b. Parse calendar_dates for service filtering
      this.parseCalendarDates(files.get('calendar_dates.txt'));

      // 3c. Build stop_code index for sibling stop lookup
      this.parseStopCodes(files.get('stops.txt'));

      // 4. Parse stop_times and populate LineStops
      await this.importStopTimes(files.get('stop_times.txt'));

      // 5. Import shapes
      const shapesImported = await this.importShapes(files.get('shapes.txt'));

      this.logger.log(
        `GTFS import complete: ${stopsImported} stops, ${linesImported} lines, ${shapesImported} shapes`,
      );

      return {
        stops: stopsImported,
        lines: linesImported,
        shapes: shapesImported,
      };
    } finally {
      timer.dispose();
    }
  }

  getStopTimesMap(): Map<string, StopTimeEntry[]> {
    return this.stopTimesMap;
  }

  getTripToRouteMap(): Map<string, string> {
    return this.tripToRouteMap;
  }

  getStopToTripsMap(): Map<string, StopTimeEntry[]> {
    return this.stopToTripsMap;
  }

  getRoutesMap(): Map<
    string,
    { routeId: string; shortName: string; type: string; color?: string }
  > {
    return this.routesMap;
  }

  getTripsMap(): Map<
    string,
    { tripId: string; routeId: string; serviceId: string; headsign: string }
  > {
    return this.tripsMap;
  }

  /** Recompute active service IDs when date changes (cached per day) */
  private getActiveServiceIds(): Set<string> {
    const now = new Date();
    const todayStr =
      String(now.getFullYear()) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');

    if (todayStr === this.cachedDateStr && this.cachedActiveServices) {
      return this.cachedActiveServices;
    }

    this.cachedActiveServices = new Set(
      this.calendarDatesRaw
        .filter((r) => r.date === todayStr && r.exception_type === '1')
        .map((r) => r.service_id),
    );
    this.cachedDateStr = todayStr;
    this.logger.log(
      `Recomputed active services: ${this.cachedActiveServices.size} for ${todayStr}`,
    );
    return this.cachedActiveServices;
  }

  /** Check if a trip's service is active today */
  isTripActiveToday(tripId: string): boolean {
    const activeServices = this.getActiveServiceIds();
    if (activeServices.size === 0) return true; // no calendar data = assume all active
    const serviceId = this.tripServiceMap.get(tripId);
    if (!serviceId) return false;
    return activeServices.has(serviceId);
  }

  /** Get all sibling stop IDs sharing the same stop_code (in-memory, no DB) */
  getSiblingStopIds(stopGtfsId: string): string[] {
    const code = this.stopIdToCode.get(stopGtfsId);
    if (!code) return [stopGtfsId];
    return this.stopsByCode.get(code) ?? [stopGtfsId];
  }

  private buildReverseIndex(): void {
    this.stopToTripsMap.clear();
    for (const [, entries] of this.stopTimesMap) {
      for (const entry of entries) {
        if (!this.stopToTripsMap.has(entry.stopGtfsId)) {
          this.stopToTripsMap.set(entry.stopGtfsId, []);
        }
        this.stopToTripsMap.get(entry.stopGtfsId)!.push(entry);
      }
    }
    this.logger.log(
      `Built reverse index for ${this.stopToTripsMap.size} stops`,
    );
  }

  // --- Private import methods ---

  /** Populate in-memory routesMap without DB writes (used on warm startup) */
  private populateRoutesMap(
    content: string,
    translations: Map<string, Map<string, string>>,
  ): void {
    const rows = parseGtfsCsv<GtfsRoute>(content);
    this.routesMap.clear();

    for (const row of rows) {
      const bgTranslation = translations.get(`routes:${row.route_id}`);
      const name =
        bgTranslation?.get('route_short_name') || row.route_short_name;
      const type = gtfsRouteTypeToString(row.route_type);

      this.routesMap.set(row.route_id, {
        routeId: row.route_id,
        shortName: name,
        type,
        color: row.route_color || undefined,
      });
    }

    this.logger.log(`Populated ${this.routesMap.size} routes in memory`);
  }

  private parseTranslations(
    content: string | undefined,
  ): Map<string, Map<string, string>> {
    // Map<"table_name:record_id:field_name", translation>
    const translationMap = new Map<string, Map<string, string>>();

    if (!content) return translationMap;

    const rows = parseGtfsCsv<GtfsTranslation>(content);
    for (const row of rows) {
      if (row.language !== 'bg') continue;
      const key = `${row.table_name}:${row.record_id}`;
      if (!translationMap.has(key)) {
        translationMap.set(key, new Map());
      }
      translationMap.get(key)!.set(row.field_name, row.translation);
    }

    return translationMap;
  }

  private async importStops(
    content: string | undefined,
    translations: Map<string, Map<string, string>>,
  ): Promise<number> {
    if (!content) {
      this.logger.warn('stops.txt not found in GTFS feed');
      return 0;
    }

    const rows = parseGtfsCsv<GtfsStop>(content);
    let imported = 0;

    for (const row of rows) {
      const lat = parseFloat(row.stop_lat);
      const lng = parseFloat(row.stop_lon);

      if (!isValidSofiaCoord(lat, lng)) continue;

      // Prefer Bulgarian translation
      const bgTranslation = translations.get(`stops:${row.stop_id}`);
      const name = bgTranslation?.get('stop_name') || row.stop_name;

      await this.transitRepository.upsertStop({
        gtfsId: row.stop_id,
        stopCode: row.stop_code || undefined,
        name,
        lat,
        lng,
      });
      imported++;
    }

    this.logger.log(
      `Imported ${imported} stops (filtered from ${rows.length})`,
    );
    return imported;
  }

  private async importRoutes(
    content: string | undefined,
    translations: Map<string, Map<string, string>>,
  ): Promise<number> {
    if (!content) {
      this.logger.warn('routes.txt not found in GTFS feed');
      return 0;
    }

    const rows = parseGtfsCsv<GtfsRoute>(content);
    let imported = 0;
    this.routesMap.clear();

    for (const row of rows) {
      const bgTranslation = translations.get(`routes:${row.route_id}`);
      const name =
        bgTranslation?.get('route_short_name') || row.route_short_name;
      const type = gtfsRouteTypeToString(row.route_type);

      this.routesMap.set(row.route_id, {
        routeId: row.route_id,
        shortName: name,
        type,
        color: row.route_color || undefined,
      });

      await this.transitRepository.upsertLine({
        gtfsId: row.route_id,
        name,
        type,
        color: row.route_color || undefined,
      });
      imported++;
    }

    this.logger.log(
      `Imported ${imported} lines (${this.routesMap.size} in memory)`,
    );
    return imported;
  }

  private parseTrips(content: string | undefined): void {
    if (!content) {
      this.logger.warn('trips.txt not found in GTFS feed');
      return;
    }

    const rows = parseGtfsCsv<GtfsTrip>(content);
    this.tripToRouteMap.clear();
    this.tripToShapeMap.clear();
    this.tripServiceMap.clear();
    this.tripsMap.clear();

    for (const row of rows) {
      this.tripToRouteMap.set(row.trip_id, row.route_id);
      if (row.service_id) {
        this.tripServiceMap.set(row.trip_id, row.service_id);
      }
      if (row.shape_id) {
        this.tripToShapeMap.set(row.trip_id, row.shape_id);
      }
      this.tripsMap.set(row.trip_id, {
        tripId: row.trip_id,
        routeId: row.route_id,
        serviceId: row.service_id,
        headsign: row.trip_headsign || '',
      });
    }

    this.logger.log(`Parsed ${rows.length} trips into memory`);
  }

  /** Parse calendar_dates.txt and store raw data for on-the-fly service filtering */
  private parseCalendarDates(content: string | undefined): void {
    if (!content) {
      this.logger.warn(
        'calendar_dates.txt not found — all trips assumed active',
      );
      this.calendarDatesRaw = [];
      this.cachedActiveServices = null;
      this.cachedDateStr = '';
      return;
    }

    this.calendarDatesRaw = parseGtfsCsv<GtfsCalendarDate>(content);
    // Invalidate cache so it recomputes on next access
    this.cachedActiveServices = null;
    this.cachedDateStr = '';

    this.logger.log(
      `Calendar: loaded ${this.calendarDatesRaw.length} calendar_dates entries`,
    );
  }

  /** Build stop_code → stopGtfsIds index from stops.txt */
  private parseStopCodes(content: string | undefined): void {
    if (!content) return;

    const rows = parseGtfsCsv<GtfsStop>(content);
    this.stopsByCode.clear();
    this.stopIdToCode.clear();

    for (const row of rows) {
      if (!row.stop_code) continue;
      this.stopIdToCode.set(row.stop_id, row.stop_code);
      if (!this.stopsByCode.has(row.stop_code)) {
        this.stopsByCode.set(row.stop_code, []);
      }
      this.stopsByCode.get(row.stop_code)!.push(row.stop_id);
    }

    this.logger.log(
      `Built stop_code index: ${this.stopsByCode.size} codes, ${this.stopIdToCode.size} stops`,
    );
  }

  private async importStopTimes(content: string | undefined): Promise<void> {
    if (!content) {
      this.logger.warn('stop_times.txt not found in GTFS feed');
      return;
    }

    const rows = parseGtfsCsv<GtfsStopTime>(content);
    this.stopTimesMap.clear();

    // Build in-memory stop_times map
    for (const row of rows) {
      const entry: StopTimeEntry = {
        tripId: row.trip_id,
        stopGtfsId: row.stop_id,
        arrivalTime: row.arrival_time,
        departureTime: row.departure_time,
        stopSequence: parseInt(row.stop_sequence, 10),
      };

      if (!this.stopTimesMap.has(row.trip_id)) {
        this.stopTimesMap.set(row.trip_id, []);
      }
      this.stopTimesMap.get(row.trip_id)!.push(entry);
    }

    // Sort each trip's stop times by sequence
    for (const [, entries] of this.stopTimesMap) {
      entries.sort((a, b) => a.stopSequence - b.stopSequence);
    }

    this.logger.log(`Loaded ${rows.length} stop_times into memory`);

    // Build reverse index for arrival lookups
    this.buildReverseIndex();

    // Populate LineStop junction table from stop_times
    await this.populateLineStops();
  }

  private async populateLineStops(): Promise<void> {
    // Collect unique (route_id, stop_id, order) tuples
    const lineStopSet = new Map<
      string,
      { routeGtfsId: string; stopGtfsId: string; stopOrder: number }
    >();

    for (const [tripId, entries] of this.stopTimesMap) {
      const routeId = this.tripToRouteMap.get(tripId);
      if (!routeId) continue;

      for (const entry of entries) {
        const key = `${routeId}:${entry.stopGtfsId}:${entry.stopSequence}`;
        if (!lineStopSet.has(key)) {
          lineStopSet.set(key, {
            routeGtfsId: routeId,
            stopGtfsId: entry.stopGtfsId,
            stopOrder: entry.stopSequence,
          });
        }
      }
    }

    // Cache line and stop lookups to avoid repeated DB queries per tuple
    const lineCache = new Map<
      string,
      Awaited<ReturnType<typeof this.transitRepository.findLineByGtfsId>>
    >();
    const stopCache = new Map<
      string,
      Awaited<ReturnType<typeof this.transitRepository.findStopByGtfsId>>
    >();

    let imported = 0;
    for (const data of lineStopSet.values()) {
      let line = lineCache.get(data.routeGtfsId);
      if (line === undefined) {
        line = await this.transitRepository.findLineByGtfsId(data.routeGtfsId);
        lineCache.set(data.routeGtfsId, line ?? null);
      }
      let stop = stopCache.get(data.stopGtfsId);
      if (stop === undefined) {
        stop = await this.transitRepository.findStopByGtfsId(data.stopGtfsId);
        stopCache.set(data.stopGtfsId, stop ?? null);
      }

      if (!line || !stop) continue;

      await this.transitRepository.upsertLineStop({
        lineId: line.id,
        stopId: stop.id,
        stopOrder: data.stopOrder,
      });
      imported++;
    }

    this.logger.log(`Populated ${imported} line-stop relationships`);
  }

  private async importShapes(content: string | undefined): Promise<number> {
    if (!content) {
      this.logger.warn('shapes.txt not found in GTFS feed');
      return 0;
    }

    const rows = parseGtfsCsv<GtfsShape>(content);

    // Group by shape_id
    const shapeGroups = new Map<
      string,
      Array<{ lat: number; lng: number; seq: number }>
    >();
    for (const row of rows) {
      const shapeId = row.shape_id;
      if (!shapeGroups.has(shapeId)) {
        shapeGroups.set(shapeId, []);
      }
      shapeGroups.get(shapeId)!.push({
        lat: parseFloat(row.shape_pt_lat),
        lng: parseFloat(row.shape_pt_lon),
        seq: parseInt(row.shape_pt_sequence, 10),
      });
    }

    // Map shape_id to route_id (pick first trip for each route)
    const routeToShapeId = new Map<string, string>();
    for (const [tripId, shapeId] of this.tripToShapeMap) {
      const routeId = this.tripToRouteMap.get(tripId);
      if (routeId && !routeToShapeId.has(routeId)) {
        routeToShapeId.set(routeId, shapeId);
      }
    }

    let imported = 0;
    for (const [routeGtfsId, shapeId] of routeToShapeId) {
      const line = await this.transitRepository.findLineByGtfsId(routeGtfsId);
      const points = shapeGroups.get(shapeId);

      if (!line || !points) continue;

      // Sort by sequence
      points.sort((a, b) => a.seq - b.seq);

      // Simplify polyline
      const rawCoords: [number, number][] = points.map((p) => [p.lat, p.lng]);
      const simplified = simplifyPolyline(rawCoords, POLYLINE_EPSILON);

      await this.transitRepository.upsertShape({
        lineId: line.id,
        coordinates: simplified,
      });
      imported++;
    }

    this.logger.log(
      `Imported ${imported} shapes (from ${shapeGroups.size} shape groups)`,
    );
    return imported;
  }

  /**
   * Load stop_times from GTFS feed into memory without full DB import.
   * Used on startup when DB already has stops/lines.
   */
  private async loadStopTimesFromGtfs(): Promise<void> {
    this.logger.log('Loading stop_times into memory from GTFS feed...');

    try {
      const response = await fetch(GTFS_STATIC_URL);
      if (!response.ok) {
        this.logger.error(
          `Failed to download GTFS for stop_times: HTTP ${response.status}`,
        );
        return;
      }

      const zipBuffer = Buffer.from(await response.arrayBuffer());
      const zip = new AdmZip(zipBuffer);

      // Parse translations for Bulgarian names
      const translationsEntry = zip.getEntry('translations.txt');
      const translations = this.parseTranslations(
        translationsEntry?.getData().toString('utf-8'),
      );

      // Always populate in-memory routesMap from routes.txt
      const routesEntry = zip.getEntry('routes.txt');
      if (routesEntry) {
        const routesContent = routesEntry.getData().toString('utf-8');
        this.populateRoutesMap(routesContent, translations);

        // Import routes to DB if the lines table is empty
        const existingLines = await this.transitRepository.findAllLines();
        if (existingLines.length === 0) {
          const linesImported = await this.importRoutes(
            routesContent,
            translations,
          );
          this.logger.log(
            `Re-imported ${linesImported} lines (table was empty)`,
          );
        }
      }

      const tripsEntry = zip.getEntry('trips.txt');
      if (tripsEntry) {
        this.parseTrips(tripsEntry.getData().toString('utf-8'));
      }

      const calendarDatesEntry = zip.getEntry('calendar_dates.txt');
      if (calendarDatesEntry) {
        this.parseCalendarDates(calendarDatesEntry.getData().toString('utf-8'));
      }

      const stopsEntry = zip.getEntry('stops.txt');
      if (stopsEntry) {
        this.parseStopCodes(stopsEntry.getData().toString('utf-8'));
      }

      const stopTimesEntry = zip.getEntry('stop_times.txt');
      if (stopTimesEntry) {
        const content = stopTimesEntry.getData().toString('utf-8');
        const rows = parseGtfsCsv<GtfsStopTime>(content);
        this.stopTimesMap.clear();

        for (const row of rows) {
          const entry: StopTimeEntry = {
            tripId: row.trip_id,
            stopGtfsId: row.stop_id,
            arrivalTime: row.arrival_time,
            departureTime: row.departure_time,
            stopSequence: parseInt(row.stop_sequence, 10),
          };

          if (!this.stopTimesMap.has(row.trip_id)) {
            this.stopTimesMap.set(row.trip_id, []);
          }
          this.stopTimesMap.get(row.trip_id)!.push(entry);
        }

        for (const [, entries] of this.stopTimesMap) {
          entries.sort((a, b) => a.stopSequence - b.stopSequence);
        }

        // Build reverse index for arrival lookups
        this.buildReverseIndex();

        this.logger.log(
          `Loaded ${rows.length} stop_times into memory (skip DB import)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to load stop_times: ${(error as Error).message}. Arrival data will be unavailable.`,
      );
    }
  }
}
