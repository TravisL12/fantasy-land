import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlayerStatsQueryDto } from './dto/player-stats-query.dto.js';
import { PlayerParamsDto, SportParamsDto } from './dto/sport-params.dto.js';
import { StatsQueryDto } from './dto/stats-query.dto.js';
import type {
  PlayerStatsResponseDto,
  SportCatalogResponseDto,
  StatsResponseDto,
} from './dto/stats-response.dto.js';
import { SPORTS_ROUTE, SPORTS_ROUTES } from './sports.constants.js';
import { SportsService } from './sports.service.js';

@Controller(SPORTS_ROUTE)
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Get()
  list(): Promise<SportCatalogResponseDto[]> {
    return this.sportsService.getCatalogs();
  }

  @Get(SPORTS_ROUTES.catalog)
  catalog(
    @Param() { sport }: SportParamsDto,
  ): Promise<SportCatalogResponseDto> {
    return this.sportsService.getCatalog(sport);
  }

  @Get(SPORTS_ROUTES.stats)
  stats(
    @Param() { sport }: SportParamsDto,
    @Query() query: StatsQueryDto,
  ): Promise<StatsResponseDto> {
    return this.sportsService.getStats(sport, query);
  }

  @Get(SPORTS_ROUTES.playerStats)
  playerStats(
    @Param() { sport, playerId }: PlayerParamsDto,
    @Query() query: PlayerStatsQueryDto,
  ): Promise<PlayerStatsResponseDto> {
    return this.sportsService.getPlayerStats(sport, playerId, query);
  }
}
