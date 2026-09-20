import { absent, contains, includesAll, orDefault, present } from '../eval.match.js';
import type { EvalCase } from '../eval.types.js';

/**
 * The near neighbours. Every tool the registry offers is paid for in the prompt
 * on every round and gives the model one more way to choose wrong; these cases
 * are where that cost either shows up or does not.
 */
export const ROUTING_CASES: EvalCase[] = [
  {
    id: 'route-baseball-tool-on-nfl',
    question: 'Who is starting at quarterback for the Chiefs this week?',
    tags: ['routing'],
    expect: [],
    forbid: ['get_pitcher_starts', 'get_matchup_ratings', 'get_player_status'],
    why: 'The baseball tools default to mlb and would answer a football question with a clear refusal — but only if they are not called at all.',
  },
  {
    id: 'route-weeks-on-mlb',
    question: 'How did Aaron Judge do in his last 15 games?',
    tags: ['routing', 'window'],
    expect: [
      {
        tool: 'get_player_stats',
        args: { sport: 'mlb', lastN: 15, weeks: absent() },
      },
    ],
    why: 'Baseball has no weeks. lastN is the window that works for both sports.',
  },
  {
    id: 'route-preview-not-schedule',
    question: 'How do the Ravens and Steelers match up?',
    tags: ['routing'],
    expect: [
      {
        tool: 'get_game_preview',
        args: { sport: orDefault('nfl'), teamA: present(), teamB: present() },
      },
    ],
    forbid: ['get_schedule', 'get_standings'],
  },
  {
    id: 'route-schedule-not-preview',
    question: 'What was the score of the Packers game last week?',
    tags: ['routing'],
    expect: [{ tool: 'get_schedule', args: { sport: orDefault('nfl'), team: present() } }],
    why: 'A result is a schedule row carrying a score. A preview would answer a different question convincingly.',
  },
  {
    id: 'route-compare-not-two-lookups',
    question: 'Is Saquon Barkley or Derrick Henry the better play this week?',
    tags: ['routing', 'compare'],
    expect: [{ tool: 'compare_players', args: { sport: orDefault('nfl') } }],
    why: 'Two players in one question is one compare call, not two get_player_stats calls the model diffs itself.',
  },
  {
    id: 'route-expected-not-leaderboard',
    question: 'Is Jordan Addison getting lucky or is his production real?',
    tags: ['routing', 'expected-points'],
    expect: [{ tool: 'get_expected_points', args: { sport: orDefault('nfl') } }],
    why: 'Luck versus real production is exactly what the expected-points delta measures.',
  },
  {
    id: 'route-catalog-before-guessing',
    question: 'Rank MLB hitters by wRC+.',
    tags: ['routing', 'unknown-stat'],
    expect: [{ tool: 'get_leaderboard', args: { sport: 'mlb' } }],
    why: 'wRC+ is not in the hitting group. The tool must reject the sort key and the model must say so rather than ranking by something else and presenting it as wRC+.',
  },
  {
    id: 'route-stat-alias',
    question: 'Which MLB pitchers had the most strikeouts last season?',
    tags: ['routing', 'alias'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: { sport: 'mlb', group: 'pitching', sort: present() },
      },
    ],
    why: 'Upstream calls it strikeOuts. Loose key matching is what keeps the English word from costing a round.',
  },
  {
    id: 'route-season-from-context',
    question: 'Who led the NFL in receiving yards last season?',
    tags: ['routing', 'season'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: { sport: orDefault('nfl'), season: present(), sort: contains('rec') },
      },
    ],
    why: 'SEASON_CONTEXT tells the model what year it is; "last season" has to become an explicit season argument.',
  },
  {
    id: 'route-stats-filter',
    question: 'Show me only home runs and RBIs for the top MLB hitters.',
    tags: ['routing', 'stats-filter'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: { sport: 'mlb', stats: includesAll('homeRuns', 'rbi') },
      },
    ],
    why: 'The stats filter is the difference between a 1.8k-token result and a 1k one, on every round that follows.',
  },
  {
    id: 'route-no-baseball-league',
    question: 'What players are on my fantasy baseball roster?',
    tags: ['routing', 'sleeper'],
    expect: [],
    forbid: ['get_user_leagues'],
    why: 'Sleeper is NFL only. The model is told to ask which players are on the roster rather than looking it up.',
  },
  {
    id: 'route-single-tool-for-starts',
    question: 'Give me the probable pitchers for Friday.',
    tags: ['routing', 'starts'],
    expect: [{ tool: 'get_pitcher_starts', args: { sport: orDefault('mlb') } }],
    forbid: ['get_schedule'],
    why: 'get_probable_pitchers was absorbed; the old name must not send the model to the schedule instead.',
  },
];
