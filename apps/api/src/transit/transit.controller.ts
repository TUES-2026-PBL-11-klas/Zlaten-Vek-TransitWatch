import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Header,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import {
  ITransitRepository,
  TRANSIT_REPOSITORY,
} from './interfaces/transit-repository.interface';
import { GtfsStaticService } from './services/gtfs-static.service';
import { GtfsRealtimeService } from './services/gtfs-realtime.service';
import { StopArrivalService } from './services/stop-arrival.service';

@Controller('transit')
export class TransitController {
  constructor(
    @Inject(TRANSIT_REPOSITORY)
    private readonly transitRepository: ITransitRepository,
    private readonly gtfsStaticService: GtfsStaticService,
    private readonly gtfsRealtimeService: GtfsRealtimeService,
    private readonly stopArrivalService: StopArrivalService,
  ) {}

  @Public()
  @Get('stops')
  async getStopsByBbox(@Query('bbox') bbox: string) {
    if (!bbox) {
      throw new BadRequestException(
        'bbox query parameter required (format: minLat,minLng,maxLat,maxLng)',
      );
    }

    const parts = bbox.split(',').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) {
      throw new BadRequestException(
        'Invalid bbox format. Expected: minLat,minLng,maxLat,maxLng',
      );
    }

    const [minLat, minLng, maxLat, maxLng] = parts;

    const stops = await this.transitRepository.findStopsByBbox({
      minLat,
      minLng,
      maxLat,
      maxLng,
    });

    // Only return stops that have scheduled stop_times (via siblings)
    const stopToTrips = this.gtfsStaticService.getStopToTripsMap();
    return stops.filter((stop) => {
      if (!stop.gtfsId) return false;
      const siblings = this.gtfsStaticService.getSiblingStopIds(stop.gtfsId);
      return siblings.some((sid) => stopToTrips.has(sid));
    });
  }

  @Public()
  @Get('stops/:id')
  async getStopDetail(@Param('id') id: string) {
    const stop = await this.transitRepository.findStopById(id);
    if (!stop) {
      throw new NotFoundException(`Stop ${id} not found`);
    }
    return stop;
  }

  @Public()
  @Get('lines')
  @Header('Cache-Control', 'public, max-age=86400')
  async getAllLines() {
    return this.transitRepository.findAllLines();
  }

  @Public()
  @Get('lines/:id/shape')
  @Header('Cache-Control', 'public, max-age=86400')
  async getLineShape(@Param('id') id: string) {
    const shape = await this.transitRepository.findShapeByLineId(id);
    if (!shape) {
      return { id: null, lineId: id, coordinates: [] };
    }
    return shape;
  }

  @Public()
  @Get('vehicles')
  @Header('Cache-Control', 'no-cache')
  getVehicles(@Query('since') since?: string) {
    const sinceTs = since ? parseInt(since, 10) : undefined;
    const allVehicles = this.gtfsRealtimeService.getVehicles(
      sinceTs && !isNaN(sinceTs) ? sinceTs : undefined,
    );

    // Filter out ghost vehicles with no valid route
    const routesMap = this.gtfsStaticService.getRoutesMap();
    const vehicles = allVehicles.filter(
      (v) => v.routeGtfsId && routesMap.has(v.routeGtfsId),
    );

    return {
      timestamp: Math.floor(Date.now() / 1000),
      count: vehicles.length,
      vehicles,
    };
  }

  @Public()
  @Get('vehicles/:vehicleId/trip')
  @Header('Cache-Control', 'no-cache')
  async getVehicleTripDetails(@Param('vehicleId') vehicleId: string) {
    const timeline =
      await this.stopArrivalService.getVehicleTripTimeline(vehicleId);
    if (!timeline) {
      throw new NotFoundException(
        `Vehicle ${vehicleId} not found or trip unavailable`,
      );
    }
    return timeline;
  }

  @Public()
  @Get('stops/:id/arrivals')
  @Header('Cache-Control', 'no-cache')
  async getStopArrivals(@Param('id') id: string) {
    const stop = await this.transitRepository.findStopById(id);
    if (!stop) {
      throw new NotFoundException(`Stop ${id} not found`);
    }

    const arrivals = await this.stopArrivalService.getArrivals(id);

    return {
      stopId: stop.id,
      stopName: stop.name,
      arrivals,
    };
  }

  @Public()
  @Get('trips/:tripId/timeline')
  @Header('Cache-Control', 'no-cache')
  async getTripTimeline(
    @Param('tripId') tripId: string,
    @Query('route') routeGtfsId?: string,
  ) {
    const timeline = await this.stopArrivalService.getTripTimeline(
      tripId,
      routeGtfsId,
    );
    if (!timeline) {
      throw new NotFoundException(`Trip ${tripId} not found`);
    }
    return timeline;
  }

  @Public()
  @Post('import')
  async triggerImport() {
    const result = await this.gtfsStaticService.importStaticData();
    return {
      message: 'GTFS import completed',
      ...result,
    };
  }
}
