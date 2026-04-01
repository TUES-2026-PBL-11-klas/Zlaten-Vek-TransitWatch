import { Line, Stop, Shape } from '@prisma/client';

export interface StopWithLineCount extends Stop {
  lineCount: number;
}

export interface StopDetail extends Stop {
  lineStops: Array<{
    line: Line;
    stopOrder: number;
  }>;
}

export interface BboxQuery {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface ITransitRepository {
  // Stops
  upsertStop(data: {
    gtfsId: string;
    stopCode?: string;
    name: string;
    lat: number;
    lng: number;
  }): Promise<Stop>;
  findStopsByBbox(bbox: BboxQuery): Promise<StopWithLineCount[]>;
  findStopById(id: string): Promise<StopDetail | null>;

  // Lines
  upsertLine(data: {
    gtfsId: string;
    name: string;
    type: string;
    color?: string;
  }): Promise<Line>;
  findAllLines(): Promise<Line[]>;
  findLineByGtfsId(gtfsId: string): Promise<Line | null>;

  // LineStops
  upsertLineStop(data: {
    lineId: string;
    stopId: string;
    stopOrder: number;
  }): Promise<void>;
  clearLineStops(lineId: string): Promise<void>;

  // Shapes
  upsertShape(data: {
    lineId: string;
    coordinates: [number, number][];
  }): Promise<Shape>;
  findShapeByLineId(lineId: string): Promise<Shape | null>;

  // Bulk helpers
  findStopByGtfsId(gtfsId: string): Promise<Stop | null>;
  findSiblingStopGtfsIds(stopId: string): Promise<string[]>;
  countStopsWithGtfsId(): Promise<number>;
}

export const TRANSIT_REPOSITORY = 'ITransitRepository';
