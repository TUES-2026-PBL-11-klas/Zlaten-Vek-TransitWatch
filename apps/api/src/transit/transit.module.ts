import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TransitController } from './transit.controller';
import { GtfsStaticService } from './services/gtfs-static.service';
import { GtfsRealtimeService } from './services/gtfs-realtime.service';
import { StopArrivalService } from './services/stop-arrival.service';
import { PrismaTransitRepository } from './repositories/prisma-transit.repository';
import { TRANSIT_REPOSITORY } from './interfaces/transit-repository.interface';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [TransitController],
  providers: [
    GtfsStaticService,
    GtfsRealtimeService,
    StopArrivalService,
    { provide: TRANSIT_REPOSITORY, useClass: PrismaTransitRepository },
  ],
  exports: [GtfsStaticService, GtfsRealtimeService, TRANSIT_REPOSITORY],
})
export class TransitModule {}
