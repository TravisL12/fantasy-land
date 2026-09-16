import { Module } from '@nestjs/common';
import { DataCacheModule } from '../data-cache/data-cache.module.js';
import { MlbProvider } from './providers/mlb/mlb.provider.js';
import { NflProvider } from './providers/nfl/nfl.provider.js';
import { SPORT_PROVIDERS } from './sports.constants.js';
import { SportsController } from './sports.controller.js';
import { SportsService } from './sports.service.js';

// To add a sport: implement SportProvider under providers/<sport>/ and list it here.
@Module({
  imports: [DataCacheModule],
  controllers: [SportsController],
  providers: [
    MlbProvider,
    NflProvider,
    {
      provide: SPORT_PROVIDERS,
      inject: [MlbProvider, NflProvider],
      useFactory: (...providers: [MlbProvider, NflProvider]) => providers,
    },
    SportsService,
  ],
  exports: [SportsService],
})
export class SportsModule {}
