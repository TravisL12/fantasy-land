import { Injectable } from '@nestjs/common';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asSport } from '../tools.utils.js';
import { SPORT_PARAM } from './sports-tools.constants.js';

/**
 * Without this the model has to guess group, position, stat and scoring keys,
 * which is where small models tend to invent values.
 */
@Injectable()
export class SportCatalogTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_sport_catalog',
    source: LOCAL_TOOL_SOURCE,
    description:
      'The valid keys for a sport: seasons, current week, stat groups, positions, stat keys and scoring presets. Call this before get_leaderboard if you are unsure what a filter should be.',
    parameters: {
      type: 'object',
      properties: { sport: SPORT_PARAM },
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    const catalog = await this.sports.getCatalog(asSport(args.sport));

    // Trimmed to the keys a model needs — full stat labels blow up the context.
    return {
      key: catalog.key,
      name: catalog.name,
      defaultSeason: catalog.defaultSeason,
      currentWeek: catalog.currentWeek,
      seasons: catalog.seasons.slice(-5),
      scoringPresets: catalog.scoringPresets.map(({ key }) => key),
      groups: catalog.groups.map(({ key, positions, stats }) => ({
        key,
        positions,
        stats: stats.map((stat) => stat.key),
      })),
    };
  }
}
