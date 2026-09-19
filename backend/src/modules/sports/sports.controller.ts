import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlayerStatsQueryDto } from './dto/player-stats-query.dto.js';
import {
  AvailabilityQueryDto,
  DateWindowQueryDto,
  ExpectedPointsQueryDto,
  GamePreviewQueryDto,
  MatchupsQueryDto,
  PlayerDirectoryQueryDto,
  ScheduleQueryDto,
  StandingsQueryDto,
} from './dto/sport-views-query.dto.js';
import { PlayerParamsDto, SportParamsDto } from './dto/sport-params.dto.js';
import { StatsQueryDto } from './dto/stats-query.dto.js';
import type {
  PlayerStatsResponseDto,
  SportCatalogResponseDto,
  StatsResponseDto,
} from './dto/stats-response.dto.js';
import type { GamePreview, StandingsReport } from './sports.types.js';
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

  /**
   * Everything below is the same data the chat tools read, served straight to
   * the UI. A view a sport does not support answers with the service's own
   * "not wired up for this sport" message rather than an empty page.
   */
  @Get(SPORTS_ROUTES.expectedPoints)
  expectedPoints(
    @Param() { sport }: SportParamsDto,
    @Query() query: ExpectedPointsQueryDto,
  ) {
    return this.sportsService.getExpectedPoints(sport, query);
  }

  @Get(SPORTS_ROUTES.players)
  players(
    @Param() { sport }: SportParamsDto,
    @Query() query: PlayerDirectoryQueryDto,
  ) {
    return this.sportsService.getPlayerDirectory(sport, query);
  }

  @Get(SPORTS_ROUTES.schedule)
  schedule(
    @Param() { sport }: SportParamsDto,
    @Query() query: ScheduleQueryDto,
  ) {
    return this.sportsService.getSchedule(sport, query);
  }

  @Get(SPORTS_ROUTES.preview)
  preview(
    @Param() { sport }: SportParamsDto,
    @Query() query: GamePreviewQueryDto,
  ): Promise<GamePreview> {
    return this.sportsService.getGamePreview(sport, query);
  }

  @Get(SPORTS_ROUTES.standings)
  standings(
    @Param() { sport }: SportParamsDto,
    @Query() query: StandingsQueryDto,
  ): Promise<StandingsReport> {
    return this.sportsService.getStandings(sport, query);
  }

  @Get(SPORTS_ROUTES.starts)
  starts(
    @Param() { sport }: SportParamsDto,
    @Query() query: DateWindowQueryDto,
  ) {
    return this.sportsService.getStarts(sport, query);
  }

  @Get(SPORTS_ROUTES.matchups)
  matchups(
    @Param() { sport }: SportParamsDto,
    @Query() { side, season }: MatchupsQueryDto,
  ) {
    return this.sportsService.getMatchupBoard(sport, side, season);
  }

  @Get(SPORTS_ROUTES.availability)
  availability(
    @Param() { sport }: SportParamsDto,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.sportsService.getPlayerStatuses(sport, query);
  }

  @Get(SPORTS_ROUTES.playerStats)
  playerStats(
    @Param() { sport, playerId }: PlayerParamsDto,
    @Query() query: PlayerStatsQueryDto,
  ): Promise<PlayerStatsResponseDto> {
    return this.sportsService.getPlayerStats(sport, playerId, query);
  }
}
