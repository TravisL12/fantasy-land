import { contains, includesAll, oneOf, orDefault, present, where } from '../eval.match.js';
import type { EvalCase } from '../eval.types.js';

/**
 * Baseball. `sport` is asserted on nearly every case because the tools default
 * to nfl — a question about home runs answered against football is the failure
 * the system prompt's "pass sport explicitly every time" exists to prevent.
 */
export const MLB_CASES: EvalCase[] = [
  {
    id: 'mlb-leaderboard-hr',
    question: 'Who hit the most home runs in MLB last season?',
    tags: ['mlb', 'leaderboard'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: { sport: 'mlb', sort: contains('homeRun'), group: 'hitting' },
      },
    ],
    forbid: ['compare_players'],
    why: 'The plainest ranking question there is. If this misses, nothing harder will land.',
  },
  {
    id: 'mlb-leaderboard-era',
    question: 'Show me the best MLB starting pitchers by ERA this season.',
    tags: ['mlb', 'leaderboard', 'pitching'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: { sport: 'mlb', group: 'pitching', sort: contains('era') },
      },
    ],
    why: 'ERA is a stat where a low number wins; the model has to ask for ascending order or read the rows correctly.',
  },
  {
    id: 'mlb-leaderboard-order',
    question: 'Which MLB pitchers had the lowest WHIP last year?',
    tags: ['mlb', 'leaderboard', 'order'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: { sport: 'mlb', sort: contains('whip'), order: 'asc' },
      },
    ],
    why: '"Lowest" has to become order=asc, or the answer is the worst pitchers in the league.',
  },
  {
    id: 'mlb-find-player',
    question: 'Find the MLB player Ohtani.',
    tags: ['mlb', 'lookup'],
    expect: [
      { tool: 'find_player', args: { sport: 'mlb', query: contains('ohtani') } },
    ],
  },
  {
    id: 'mlb-player-totals',
    question: "What are Aaron Judge's batting stats this season?",
    tags: ['mlb', 'player'],
    expect: [
      { tool: 'find_player', args: { sport: 'mlb', query: contains('judge') } },
      { tool: 'get_player_stats', args: { sport: 'mlb', playerId: present() } },
    ],
    why: 'The id chain: a player question has to resolve a name before it can ask for stats.',
  },
  {
    id: 'mlb-player-gamelog',
    question: "Show me Shohei Ohtani's last 10 games.",
    tags: ['mlb', 'player', 'window'],
    expect: [
      {
        tool: 'get_player_stats',
        args: { sport: 'mlb', include: includesAll('games'), lastN: 10 },
      },
    ],
    why: 'include=games is how the game log is asked for; totals alone cannot answer it.',
  },
  {
    id: 'mlb-player-form',
    question: 'Has Mookie Betts been hot or cold lately?',
    tags: ['mlb', 'player', 'form'],
    expect: [
      {
        tool: 'get_player_stats',
        args: { sport: 'mlb', include: includesAll('form') },
      },
    ],
    why: 'The form engine exists precisely so this is one call rather than the model eyeballing a game log.',
  },
  {
    id: 'mlb-compare',
    question: 'Compare Juan Soto and Aaron Judge this season in MLB.',
    tags: ['mlb', 'compare'],
    expect: [
      {
        tool: 'compare_players',
        args: {
          sport: 'mlb',
          playerIds: where('two ids', (v) => Array.isArray(v) && v.length === 2),
        },
      },
    ],
    forbid: ['get_leaderboard'],
    why: 'Two named players is compare_players, not a leaderboard the model filters by hand.',
  },
  {
    id: 'mlb-pitcher-starts',
    question: 'Who is pitching tonight in MLB?',
    tags: ['mlb', 'starts'],
    expect: [{ tool: 'get_pitcher_starts', args: { sport: orDefault('mlb') } }],
    forbid: ['get_leaderboard', 'get_player_stats'],
    why: 'The probable-starters question. It absorbed get_probable_pitchers, so there is only one right answer.',
  },
  {
    id: 'mlb-two-start-week',
    question: 'Which MLB pitchers have two starts this week?',
    tags: ['mlb', 'starts'],
    expect: [
      {
        tool: 'get_pitcher_starts',
        args: { sport: orDefault('mlb'), minStarts: 2 },
      },
    ],
    why: 'minStarts is the argument that makes the two-start question a filter rather than arithmetic in the model.',
  },
  {
    id: 'mlb-confirmed-starts',
    question: 'Show me only the confirmed MLB starting pitchers for tomorrow.',
    tags: ['mlb', 'starts'],
    expect: [
      {
        tool: 'get_pitcher_starts',
        args: { sport: orDefault('mlb'), confirmedOnly: true },
      },
    ],
    why: 'Confirmed versus projected is a distinction the data carries and the model is told to pass on.',
  },
  {
    id: 'mlb-matchups',
    question: 'Which MLB teams are the best matchups for hitters right now?',
    tags: ['mlb', 'matchup'],
    expect: [
      { tool: 'get_matchup_ratings', args: { sport: 'mlb', side: present() } },
    ],
  },
  {
    id: 'mlb-availability',
    question: 'Are any Dodgers players on the injured list?',
    tags: ['mlb', 'availability'],
    expect: [
      {
        tool: 'get_player_status',
        args: { sport: 'mlb', team: present() },
      },
    ],
    why: 'Roster availability is its own tool; answering it from a stat line would silently miss anyone not playing.',
  },
  {
    id: 'mlb-standings',
    question: 'What do the AL East standings look like?',
    tags: ['mlb', 'standings'],
    expect: [
      {
        tool: 'get_standings',
        args: { sport: 'mlb', group: oneOf('ALE', 'AL East', 'al east') },
      },
    ],
    why: 'A division answers to its key and its printed name; upstream says ALE and everyone else says AL East.',
  },
  {
    id: 'mlb-magic-number',
    question: "What's the Yankees' magic number?",
    tags: ['mlb', 'standings'],
    expect: [{ tool: 'get_standings', args: { sport: 'mlb' } }],
    forbid: ['get_schedule'],
    why: 'Clinch math lives in the standings tool; counting remaining games by hand from the schedule is how it goes wrong.',
  },
  {
    id: 'mlb-schedule-team',
    question: 'What games do the Mets have coming up?',
    tags: ['mlb', 'schedule'],
    expect: [
      { tool: 'get_schedule', args: { sport: 'mlb', team: present() } },
    ],
    forbid: ['get_game_preview'],
  },
  {
    id: 'mlb-preview',
    question: 'How have the Yankees done against the Red Sox this year?',
    tags: ['mlb', 'preview'],
    expect: [
      {
        tool: 'get_game_preview',
        args: { sport: 'mlb', teamA: present(), teamB: present() },
      },
    ],
    why: 'The series record is a preview, not a schedule filter — this is what compare_teams became.',
  },
  {
    id: 'mlb-catalog',
    question: 'What baseball stats can you look up?',
    tags: ['mlb', 'catalog'],
    expect: [{ tool: 'get_sport_catalog', args: { sport: 'mlb' } }],
  },
];
