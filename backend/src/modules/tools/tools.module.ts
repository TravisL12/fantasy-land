import { Module } from '@nestjs/common';
import { McpModule } from '../mcp/mcp.module.js';
import { SportsModule } from '../sports/sports.module.js';
import { ComparePlayersTool } from './sports/compare-players.tool.js';
import { FindPlayerTool } from './sports/find-player.tool.js';
import { LeaderboardTool } from './sports/leaderboard.tool.js';
import { PlayerGameLogTool } from './sports/player-game-log.tool.js';
import { PlayerSeasonStatsTool } from './sports/player-season-stats.tool.js';
import { SportCatalogTool } from './sports/sport-catalog.tool.js';
import { FANTASY_TOOLS } from './tools.constants.js';
import { ToolRegistry } from './tools.registry.js';

const TOOLS = [
  FindPlayerTool,
  SportCatalogTool,
  LeaderboardTool,
  PlayerSeasonStatsTool,
  PlayerGameLogTool,
  ComparePlayersTool,
] as const;

// To add a tool: implement FantasyTool under a subfolder and list it here.
@Module({
  imports: [SportsModule, McpModule],
  providers: [
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
