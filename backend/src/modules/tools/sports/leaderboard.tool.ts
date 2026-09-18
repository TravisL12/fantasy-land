import { BadRequestException, Injectable } from '@nestjs/common';
import { StatsQueryDto } from '../../sports/dto/stats-query.dto.js';
import { SportsService } from '../../sports/sports.service.js';
import {
  COMPUTED_SORT_KEYS,
  SORT_ORDERS,
} from '../../sports/sports.constants.js';
import type { SportCatalog, StatGroup } from '../../sports/sports.types.js';
import { matchKey, resolveStatKey } from '../../sports/sports.utils.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type {
  FantasyTool,
  ToolContext,
  ToolDefinition,
} from '../tools.types.js';
import {
  asLimit,
  asNumber,
  asSport,
  asString,
  pickStats,
  resolveStatKeys,
} from '../tools.utils.js';
import {
  GROUP_PARAM,
  LEADERBOARD_LIMIT,
  SCORING_PARAM,
  SEASON_PARAM,
  SPORTS_TOOL_MESSAGES,
  SPORT_PARAM,
  STATS_PARAM,
} from './sports-tools.constants.js';

/** Ranked stat lines — "best X by Y" questions. */
@Injectable()
export class LeaderboardTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_leaderboard',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Rank players by fantasy points or any stat, filtered by position, week and stat group. Use this for "best/top players" questions. Rows come back already ranked — report them in the order given. Call get_sport_catalog if you need the valid group, position, stat or scoring keys.',
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        season: SEASON_PARAM,
        scoring: SCORING_PARAM,
        week: {
          type: 'integer',
          description: 'A single week. Omit for season totals.',
        },
        group: GROUP_PARAM,
        position: {
          type: 'string',
          description: 'Filter to one position, e.g. "WR".',
        },
        sort: {
          type: 'string',
          description:
            'What to rank by: "fantasyPoints" (default), "fantasyPointsPerGame", "gamesPlayed", or any stat key.',
        },
        order: {
          type: 'string',
          enum: Object.values(SORT_ORDERS),
          description: 'Sort direction. Defaults to desc.',
        },
        minGames: {
          type: 'integer',
          description: 'Ignore players below this many games played.',
        },
        stats: STATS_PARAM,
        limit: {
          type: 'integer',
          description: `How many players to return (default ${LEADERBOARD_LIMIT.default}, max ${LEADERBOARD_LIMIT.max}).`,
        },
      },
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>, context?: ToolContext) {
    const sport = asSport(args.sport);
    const groupKey = asString(args.group);
    const catalog = await this.sports.getCatalog(sport);
    const group = resolveGroup(catalog, groupKey);
    const sort = resolveSort(group, asString(args.sort));

    // The column a ranking was built on always comes back, whatever the stat
    // filter says — a top-ten by home runs with no home runs in it is unusable.
    const keys = resolveStatKeys(group, args.stats, {
      full: context?.full,
      extra: [sort],
    });

    const { kind: _kind, ...result } = await this.sports.getStats(
      sport,
      Object.assign(new StatsQueryDto(), {
        season: asString(args.season),
        week: asNumber(args.week),
        group: groupKey,
        position: asString(args.position),
        scoring: asString(args.scoring),
        sort,
        order: asString(args.order) ?? SORT_ORDERS.desc,
        minGames: asNumber(args.minGames) ?? 0,
        limit: asLimit(args.limit, LEADERBOARD_LIMIT),
      }),
    );

    return {
      ...result,
      rows: result.rows.map(
        ({
          player,
          gamesPlayed,
          fantasyPoints,
          fantasyPointsPerGame,
          stats,
        }) => ({
          ...player,
          gamesPlayed,
          fantasyPoints,
          fantasyPointsPerGame,
          stats: pickStats(stats, keys),
        }),
      ),
    };
  }
}

/** Matched the way the service will match it, so the stat filter agrees. */
const resolveGroup = (catalog: SportCatalog, groupKey: string | undefined) => {
  const keys = catalog.groups.map(({ key }) => key);
  const match = groupKey && matchKey(keys, groupKey);
  return catalog.groups.find(({ key }) => key === match) ?? catalog.groups[0];
};

/**
 * The canonical spelling of what to rank by. Sorting by a key the group does
 * not define quietly falls back to alphabetical order, which looks like a real
 * ranking, so a name that resolves to nothing is rejected with the ones that
 * work.
 */
const resolveSort = (
  group: StatGroup | undefined,
  sort: string | undefined,
) => {
  if (!sort || !group) return sort;

  const computed = Object.values(COMPUTED_SORT_KEYS);
  const resolved = matchKey(computed, sort) ?? resolveStatKey(group, sort);
  if (resolved) return resolved;

  const stats = group.stats.map(({ key }) => key);
  throw new BadRequestException(
    SPORTS_TOOL_MESSAGES.unknownSort(sort, group.key, [...computed, ...stats]),
  );
};
