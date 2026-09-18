import { Module } from '@nestjs/common';
import { McpModule } from '../mcp/mcp.module.js';
import { SportsModule } from '../sports/sports.module.js';
import { MatchupRatingsTool } from './baseball/matchup-ratings.tool.js';
import { PitcherStartsTool } from './baseball/pitcher-starts.tool.js';
import { PlayerStatusTool } from './baseball/player-status.tool.js';
import { TeamHeadToHeadTool } from './baseball/team-head-to-head.tool.js';
import { ExpectedPointsTool } from './football/expected-points.tool.js';
import { SleeperUserService } from './sleeper/sleeper.service.js';
import { SleeperUserLeaguesTool } from './sleeper/user-leagues.tool.js';
import { ComparePlayersTool } from './sports/compare-players.tool.js';
import { FindPlayerTool } from './sports/find-player.tool.js';
import { LeaderboardTool } from './sports/leaderboard.tool.js';
import { PlayerStatsTool } from './sports/player-stats.tool.js';
import { SportCatalogTool } from './sports/sport-catalog.tool.js';
import { FANTASY_TOOLS } from './tools.constants.js';
import { ToolRegistry } from './tools.registry.js';

/**
 * Every tool the model sees, and the whole of its per-round schema budget.
 * Prefer another argument on a tool that already owns the subject over a new
 * entry here: a near-duplicate costs context on every round and gives a small
 * model one more way to pick wrong.
 */
const TOOLS = [
  FindPlayerTool,
  SportCatalogTool,
  LeaderboardTool,
  PlayerStatsTool,
  ComparePlayersTool,
  ExpectedPointsTool,
  PitcherStartsTool,
  MatchupRatingsTool,
  TeamHeadToHeadTool,
  PlayerStatusTool,
  SleeperUserLeaguesTool,
] as const;

// To add a tool: implement FantasyTool under a subfolder and list it here.
@Module({
  imports: [SportsModule, McpModule],
  providers: [
    SleeperUserService,
    ...TOOLS,
    {
      provide: FANTASY_TOOLS,
      inject: [...TOOLS],
      useFactory: (...tools: InstanceType<(typeof TOOLS)[number]>[]) => tools,
    },
    ToolRegistry,
  ],
  exports: [ToolRegistry],
})
export class ToolsModule {}
