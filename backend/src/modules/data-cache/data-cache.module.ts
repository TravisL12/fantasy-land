import { Module } from '@nestjs/common';
import { DataCacheService } from './data-cache.service.js';

@Module({
  providers: [DataCacheService],
  exports: [DataCacheService],
})
export class DataCacheModule {}
