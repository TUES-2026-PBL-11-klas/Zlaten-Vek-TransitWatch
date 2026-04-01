import { Injectable } from '@nestjs/common';
import { Line, Prisma, Stop, Shape } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ITransitRepository,
  BboxQuery,
  StopWithLineCount,
  StopDetail,
} from '../interfaces/transit-repository.interface';

@Injectable()
export class PrismaTransitRepository implements ITransitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertStop(data: {
    gtfsId: string;
    stopCode?: string;
    name: string;
    lat: number;
    lng: number;
  }): Promise<Stop> {
    return this.prisma.stop.upsert({
      where: { gtfsId: data.gtfsId },
      update: {
        name: data.name,
        lat: data.lat,
        lng: data.lng,
        stopCode: data.stopCode,
      },
      create: data,
    });
  }

  async findStopsByBbox(bbox: BboxQuery): Promise<StopWithLineCount[]> {
    const stops = await this.prisma.stop.findMany({
      where: {
        lat: { gte: bbox.minLat, lte: bbox.maxLat },
        lng: { gte: bbox.minLng, lte: bbox.maxLng },
      },
      include: {
        _count: { select: { lineStops: true } },
        lineStops: {
          select: { line: { select: { type: true } } },
        },
      },
    });

    return stops.map((stop) => {
      const types = [...new Set(stop.lineStops.map((ls) => ls.line.type))];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { lineStops: _ls, ...rest } = stop;
      return {
        ...rest,
        lineCount: stop._count.lineStops,
        types,
      };
    });
  }

  async findStopById(id: string): Promise<StopDetail | null> {
    const stop = await this.prisma.stop.findUnique({
      where: { id },
      include: {
        lineStops: {
          include: { line: true },
          orderBy: { stopOrder: 'asc' },
        },
      },
    });

    if (!stop) return null;

    return {
      ...stop,
      lineStops: stop.lineStops.map((ls) => ({
        line: ls.line,
        stopOrder: ls.stopOrder,
      })),
    };
  }

  async upsertLine(data: {
    gtfsId: string;
    name: string;
    type: string;
    color?: string;
  }): Promise<Line> {
    return this.prisma.line.upsert({
      where: { gtfsId: data.gtfsId },
      update: { name: data.name, type: data.type, color: data.color },
      create: data,
    });
  }

  async findAllLines(): Promise<Line[]> {
    return this.prisma.line.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async findLineByGtfsId(gtfsId: string): Promise<Line | null> {
    return this.prisma.line.findFirst({ where: { gtfsId } });
  }

  async upsertLineStop(data: {
    lineId: string;
    stopId: string;
    stopOrder: number;
  }): Promise<void> {
    await this.prisma.lineStop.upsert({
      where: {
        lineId_stopId_stopOrder: {
          lineId: data.lineId,
          stopId: data.stopId,
          stopOrder: data.stopOrder,
        },
      },
      update: {},
      create: data,
    });
  }

  async clearLineStops(lineId: string): Promise<void> {
    await this.prisma.lineStop.deleteMany({ where: { lineId } });
  }

  async upsertShape(data: {
    lineId: string;
    coordinates: [number, number][];
  }): Promise<Shape> {
    return this.prisma.shape.upsert({
      where: { lineId: data.lineId },
      update: {
        coordinates: data.coordinates as unknown as Prisma.InputJsonValue,
      },
      create: {
        lineId: data.lineId,
        coordinates: data.coordinates as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async findShapeByLineId(lineId: string): Promise<Shape | null> {
    return this.prisma.shape.findUnique({ where: { lineId } });
  }

  async findStopByGtfsId(gtfsId: string): Promise<Stop | null> {
    return this.prisma.stop.findFirst({ where: { gtfsId } });
  }

  async findSiblingStopGtfsIds(stopId: string): Promise<string[]> {
    const stop = await this.prisma.stop.findUnique({
      where: { id: stopId },
      select: { stopCode: true, gtfsId: true },
    });
    if (!stop?.stopCode) return stop?.gtfsId ? [stop.gtfsId] : [];

    const siblings = await this.prisma.stop.findMany({
      where: { stopCode: stop.stopCode, gtfsId: { not: null } },
      select: { gtfsId: true },
    });
    return siblings.map((s) => s.gtfsId!);
  }

  async countStopsWithGtfsId(): Promise<number> {
    return this.prisma.stop.count({
      where: { gtfsId: { not: null } },
    });
  }
}
