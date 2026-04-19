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
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import {
  ITransitRepository,
  TRANSIT_REPOSITORY,
} from './interfaces/transit-repository.interface';
import { GtfsStaticService } from './services/gtfs-static.service';
import { GtfsRealtimeService } from './services/gtfs-realtime.service';
import { StopArrivalService } from './services/stop-arrival.service';

@ApiTags('transit')
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
  @ApiOperation({ summary: 'Get transit stops within a bounding box' })
  @ApiQuery({
    name: 'bbox',
    description: 'Bounding box as minLat,minLng,maxLat,maxLng',
    example: '42.65,23.28,42.75,23.42',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'List of stops within the bbox that have scheduled trips',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing or malformed bbox parameter',
  })
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
  @ApiOperation({ summary: 'Get a single stop by ID' })
  @ApiParam({ name: 'id', description: 'Stop UUID' })
  @ApiResponse({ status: 200, description: 'Stop details' })
  @ApiResponse({ status: 404, description: 'Stop not found' })
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
  @ApiOperation({ summary: 'Get all transit lines (cached 24 h)' })
  @ApiResponse({ status: 200, description: 'Full list of transit lines' })
  async getAllLines() {
    return this.transitRepository.findAllLines();
  }

  @Public()
  @Get('lines/:id/shape')
  @Header('Cache-Control', 'public, max-age=86400')
  @ApiOperation({
    summary: 'Get the polyline shape for a transit line (cached 24 h)',
  })
  @ApiParam({ name: 'id', description: 'Transit line UUID' })
  @ApiResponse({
    status: 200,
    description: 'Shape with coordinate array (empty array if no shape found)',
  })
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
  @ApiOperation({ summary: 'Get real-time vehicle positions' })
  @ApiQuery({
    name: 'since',
    description:
      'Unix timestamp — only return vehicles updated after this time',
    required: false,
    example: '1700000000',
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle positions with timestamp and count',
    schema: {
      example: {
        timestamp: 1700000000,
        count: 42,
        vehicles: [
          { vehicleId: 'VH-1042', routeGtfsId: '6', lat: 42.7, lng: 23.32 },
        ],
      },
    },
  })
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
  @ApiOperation({ summary: 'Get the current trip timeline for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle identifier' })
  @ApiResponse({
    status: 200,
    description: 'Trip timeline with stop sequence and arrival times',
  })
  @ApiResponse({
    status: 404,
    description: 'Vehicle not found or trip unavailable',
  })
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
  @ApiOperation({ summary: 'Get upcoming vehicle arrivals at a stop' })
  @ApiParam({ name: 'id', description: 'Stop UUID' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming arrivals for the stop',
    schema: {
      example: {
        stopId: 'uuid',
        stopName: 'Орлов мост',
        arrivals: [{ vehicleId: 'VH-1042', routeName: '6', etaSeconds: 120 }],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Stop not found' })
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
  @ApiOperation({ summary: 'Get the stop timeline for a GTFS trip' })
  @ApiParam({ name: 'tripId', description: 'GTFS trip ID' })
  @ApiQuery({
    name: 'route',
    description: 'GTFS route ID to disambiguate trips',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Trip timeline with stop sequence' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
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
  @ApiOperation({ summary: 'Trigger a manual GTFS static data import' })
  @ApiResponse({
    status: 201,
    description: 'Import completed with result summary',
  })
  async triggerImport() {
    const result = await this.gtfsStaticService.importStaticData();
    return {
      message: 'GTFS import completed',
      ...result,
    };
  }
}
