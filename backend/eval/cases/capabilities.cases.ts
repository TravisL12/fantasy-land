import { contains, includesAll, oneOf, orDefault, present, where } from '../eval.match.js';
import type { EvalCase } from '../eval.types.js';

/**
 * The arguments added for windowed leaderboards, multi-season views, splits and
 * position context. Every one of them is paid for in the prompt on every round
 * whether or not it is used, so these cases are what says the payment was worth
 * making — and, just as much, whether they confused the choices that already
 * worked.
 */
export const CAPABILITY_CASES: EvalCase[] = [
  {
    id: 'cap-window-weeks',
    question: 'Who are the top 10 wide receivers over the last four weeks?',
    tags: ['window', 'nfl'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: {
          sport: orDefault('nfl'),
          position: 'WR',
          weeks: where('four weeks', (v) => Array.isArray(v) && v.length === 4),
        },
      },
    ],
    forbid: ['compare_players'],
    why: 'The question the leaderboard could not answer at all before — the most common in-season one there is.',
  },
  {
    id: 'cap-window-single-week-unchanged',
    question: 'Who scored the most fantasy points in week 2?',
    tags: ['window', 'nfl', 'regression'],
    expect: [{ tool: 'get_leaderboard', args: { week: 2 } }],
    why: 'A single week must still be `week`. Adding `weeks` beside it is exactly the kind of near-duplicate that makes a small model pick wrong.',
  },
  {
    id: 'cap-window-dates-mlb',
    question: 'Which MLB hitters have been best since August 1st?',
    tags: ['window', 'mlb'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: {
          sport: 'mlb',
          group: orDefault('hitting'),
          startDate: contains('-08-01'),
        },
      },
    ],
    why: 'Baseball measures a part-season in dates, football in weeks. The model has to pick the one its sport serves.',
  },
  {
    id: 'cap-window-wrong-terms',
    question: 'Which MLB hitters were best in weeks 3 through 6?',
    tags: ['window', 'mlb', 'routing'],
    expect: [{ tool: 'get_leaderboard', args: { sport: 'mlb' } }],
    why: 'Baseball has no weeks. The tool must reject it by name and the model must say so rather than silently answering for the season.',
  },
  {
    id: 'cap-qualifier-default',
    question: 'Who leads MLB in batting average?',
    tags: ['qualifier', 'mlb'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: {
          sport: 'mlb',
          group: orDefault('hitting'),
          // Loose key matching is the point: every spelling here reaches `avg`.
          sort: oneOf('avg', 'battingAverage', 'AVG', 'battingAvg', 'average'),
        },
      },
    ],
    why: 'No argument needed: the rate stat carries its own qualifier, so the answer is the batting title rather than a 1-for-1 call-up.',
  },
  {
    id: 'cap-qualifier-explicit',
    question:
      'Best MLB batting averages among players with at least 300 plate appearances?',
    tags: ['qualifier', 'mlb'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: {
          sport: 'mlb',
          minStat: contains('plate'),
          minStatValue: 300,
        },
      },
    ],
    why: 'A stated threshold has to become the threshold, overriding the league standard.',
  },
  {
    id: 'cap-seasons-trend',
    question: 'How has Ja\'Marr Chase trended over the last three seasons?',
    tags: ['seasons', 'nfl'],
    expect: [
      {
        tool: 'get_player_stats',
        args: {
          seasons: where('three seasons', (v) => Array.isArray(v) && v.length === 3),
        },
      },
    ],
    forbid: ['get_leaderboard'],
    why: 'The trajectory question. Before this it was three separate calls the model had to assemble itself.',
  },
  {
    id: 'cap-seasons-career-high',
    question: 'What was Aaron Judge\'s best home run season?',
    tags: ['seasons', 'mlb'],
    expect: [
      {
        tool: 'get_player_stats',
        args: { sport: 'mlb', seasons: present() },
      },
    ],
  },
  {
    id: 'cap-season-single-unchanged',
    question: "What are Josh Allen's stats this season?",
    tags: ['seasons', 'nfl', 'regression'],
    expect: [
      { tool: 'get_player_stats', args: { playerId: present() } },
    ],
    why: 'One season must not start arriving as a one-element `seasons` array — that would cost a career-shaped answer for every ordinary question.',
  },
  {
    id: 'cap-split-home-away',
    question: 'How does Bijan Robinson do at home versus on the road?',
    tags: ['split', 'nfl'],
    expect: [
      { tool: 'get_player_stats', args: { venue: contains('home') } },
    ],
    why: 'The log has carried isHome all along; nothing could filter on it.',
  },
  {
    id: 'cap-split-opponent',
    question: 'How has Ja\'Marr Chase performed against the Ravens?',
    tags: ['split', 'nfl'],
    expect: [
      { tool: 'get_player_stats', args: { opponent: present() } },
    ],
  },
  {
    id: 'cap-context-is-it-good',
    question: 'Is 14 points a game good for a tight end?',
    tags: ['context', 'nfl'],
    expect: [
      {
        tool: 'get_leaderboard',
        args: { position: 'TE' },
      },
    ],
    why: 'A number needs a distribution behind it. Either the position board or a player\'s context answers it; inventing a threshold does not.',
  },
  {
    id: 'cap-context-rank',
    question: 'Where does Puka Nacua rank among wide receivers this season?',
    tags: ['context', 'nfl'],
    expect: [
      {
        tool: 'get_player_stats',
        args: { include: includesAll('context') },
      },
    ],
    why: 'Rank within position is one call now, not a leaderboard the model counts down by hand.',
  },
  {
    id: 'cap-availability-nfl',
    question: 'Are any Chiefs players injured?',
    tags: ['availability', 'nfl'],
    expect: [
      {
        tool: 'get_player_status',
        args: { sport: orDefault('nfl'), team: present() },
      },
    ],
    why: 'Football availability existed in the directory all along and the tool refused to answer for it.',
  },
  {
    id: 'cap-availability-mlb-still-works',
    question: 'Which Dodgers are on the injured list?',
    tags: ['availability', 'mlb', 'regression'],
    expect: [
      { tool: 'get_player_status', args: { sport: 'mlb', team: present() } },
    ],
    why: 'The tool moved and its default sport flipped to nfl, so a baseball question now has to say so.',
  },
];
