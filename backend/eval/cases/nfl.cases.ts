import { absent, contains, includesAll, orDefault, present, where } from '../eval.match.js';
import type { EvalCase } from '../eval.types.js';

/**
 * Football. nfl is the default sport, so these cases lean on the arguments that
 * carry the question — week, position, scoring preset — rather than on routing.
 */
export const NFL_CASES: EvalCase[] = [
  {
    id: 'nfl-leaderboard-position',
    question: 'Who are the top 10 wide receivers in PPR this season?',
    tags: ['nfl', 'leaderboard'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: {
          sport: orDefault('nfl'),
          position: 'WR',
          scoring: contains('ppr'),
          limit: 10,
        },
      },
    ],
    forbid: ['compare_players'],
    why: 'Position, scoring preset and limit all have to survive the trip from one sentence.',
  },
  {
    id: 'nfl-leaderboard-week',
    question: 'Who scored the most fantasy points in week 3?',
    tags: ['nfl', 'leaderboard', 'week'],
    expect: [{ tool: 'get_leaderboard', args: { sport: orDefault('nfl'), week: 3 } }],
    why: 'A single week is an argument on the leaderboard; without it the answer is season totals wearing a week label.',
  },
  {
    id: 'nfl-leaderboard-stat',
    question: 'Which NFL running backs had the most rushing yards last season?',
    tags: ['nfl', 'leaderboard'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: { sport: orDefault('nfl'), position: 'RB', sort: contains('rush') },
      },
    ],
  },
  {
    id: 'nfl-leaderboard-half-ppr',
    question: 'Best tight ends in half PPR this year?',
    tags: ['nfl', 'leaderboard', 'scoring'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: { sport: orDefault('nfl'), position: 'TE', scoring: contains('half') },
      },
    ],
    why: 'Three presets reproduce Sleeper exactly; picking the wrong one quietly changes every ranking.',
  },
  {
    id: 'nfl-find-player',
    question: 'Look up Ja\'Marr Chase.',
    tags: ['nfl', 'lookup'],
    expect: [{ tool: 'find_player', args: { query: contains('chase') } }],
    why: 'Accent and punctuation folding: "jamarr" has to reach Ja\'Marr Chase.',
  },
  {
    id: 'nfl-player-totals',
    question: "What are Josh Allen's passing stats this season?",
    tags: ['nfl', 'player'],
    expect: [
      { tool: 'find_player', args: { query: contains('allen') } },
      { tool: 'get_player_stats', args: { sport: orDefault('nfl'), playerId: present() } },
    ],
  },
  {
    id: 'nfl-player-form',
    question: 'Is Puka Nacua trending up or down over his last few games?',
    tags: ['nfl', 'player', 'form'],
    expect: [
      {
        tool: 'get_player_stats',
        args: { sport: orDefault('nfl'), include: includesAll('form') },
      },
    ],
  },
  {
    id: 'nfl-player-gamelog',
    question: 'Show me Bijan Robinson\'s game log for this season.',
    tags: ['nfl', 'player'],
    expect: [
      {
        tool: 'get_player_stats',
        args: { sport: orDefault('nfl'), include: includesAll('games') },
      },
    ],
  },
  {
    id: 'nfl-compare',
    question: 'Compare CeeDee Lamb and Amon-Ra St. Brown in PPR.',
    tags: ['nfl', 'compare'],
    expect: [
      {
        tool: 'compare_players',
        args: {
          sport: orDefault('nfl'),
          playerIds: where('two ids', (v) => Array.isArray(v) && v.length === 2),
          scoring: contains('ppr'),
        },
      },
    ],
    forbid: ['get_leaderboard'],
  },
  {
    id: 'nfl-compare-window',
    question: 'Compare Jayden Daniels and Caleb Williams over weeks 1 to 4.',
    tags: ['nfl', 'compare', 'window'],
    expect: [
      {
        tool: 'compare_players',
        args: { sport: orDefault('nfl'), weeks: includesAll(1, 2, 3, 4) },
      },
    ],
    why: 'Windowing is already wired into compare_players; this is the shape get_leaderboard is missing.',
  },
  {
    id: 'nfl-expected-points',
    question: 'Which NFL wide receivers are outperforming their usage this season?',
    tags: ['nfl', 'expected-points'],
    expect: [
      {
        tool: 'get_expected_points',
        args: { sport: orDefault('nfl'), position: 'WR' },
      },
    ],
    forbid: ['get_leaderboard'],
    why: 'Usage versus production is the expected-points board; a plain leaderboard cannot answer it at all.',
  },
  {
    id: 'nfl-regression',
    question: 'Which running backs are due to regress based on their opportunities?',
    tags: ['nfl', 'expected-points'],
    expect: [
      { tool: 'get_expected_points', args: { sport: orDefault('nfl'), position: 'RB' } },
    ],
    why: '"Due to regress" is the phrasing the expected-points note exists to keep from becoming a projection claim.',
  },
  {
    id: 'nfl-schedule-week',
    question: 'What NFL games are on in week 5?',
    tags: ['nfl', 'schedule', 'week'],
    expect: [
      { tool: 'get_schedule', args: { sport: orDefault('nfl'), weeks: includesAll(5) } },
    ],
    forbid: ['get_game_preview'],
  },
  {
    id: 'nfl-schedule-team',
    question: 'Show me the Chiefs schedule.',
    tags: ['nfl', 'schedule'],
    expect: [{ tool: 'get_schedule', args: { sport: orDefault('nfl'), team: present() } }],
  },
  {
    id: 'nfl-preview',
    question: 'Preview Chiefs vs Bills.',
    tags: ['nfl', 'preview'],
    expect: [
      {
        tool: 'get_game_preview',
        args: { sport: orDefault('nfl'), teamA: present(), teamB: present() },
      },
    ],
    forbid: ['get_schedule'],
    why: 'A named pairing is a preview; get_schedule would return the fixture and none of the analysis.',
  },
  {
    id: 'nfl-standings',
    question: 'What are the NFC North standings?',
    tags: ['nfl', 'standings'],
    expect: [
      {
        tool: 'get_standings',
        args: { sport: orDefault('nfl'), group: contains('nfc') },
      },
    ],
  },
  {
    id: 'nfl-clinch',
    question: 'Have the Lions clinched the division yet?',
    tags: ['nfl', 'standings'],
    expect: [{ tool: 'get_standings', args: { sport: orDefault('nfl') } }],
    forbid: ['get_schedule'],
    why: 'Clinch status comes from the standings tool, which knows what it does not know about tiebreakers.',
  },
  {
    id: 'nfl-catalog',
    question: 'What NFL scoring presets do you support?',
    tags: ['nfl', 'catalog'],
    expect: [{ tool: 'get_sport_catalog', args: { sport: orDefault('nfl') } }],
  },
  {
    id: 'sleeper-leagues',
    question: 'What Sleeper leagues is the user "sleeperuser" in?',
    tags: ['nfl', 'sleeper'],
    expect: [
      {
        tool: 'get_user_leagues',
        args: { user_id: contains('sleeperuser'), season: absent() },
      },
    ],
    why: 'Ours takes a username where an id is asked for, and defaults the season to the live one — the bundled server\'s version hardcodes a past year and comes back empty.',
  },
];
