import { START_CONFIDENCE, START_PROJECTION } from '../sports.constants.js';
import type { ProjectedStart } from '../sports.types.js';
import { projectStarts, restPattern } from './starts.js';

const games = (dates: string[], opponent = 'BOS') =>
  new Map(dates.map((date) => [date, { opponent, isHome: true }]));

const confirmed = (date: string): ProjectedStart => ({
  date,
  opponent: 'BOS',
  isHome: true,
  confidence: START_CONFIDENCE.confirmed,
});

describe('restPattern', () => {
  it('measures the typical gap between recent starts', () => {
    expect(restPattern(['2026-09-01', '2026-09-06', '2026-09-11'])).toBe(5);
  });

  it('picks up a short rotation turn', () => {
    expect(restPattern(['2026-09-01', '2026-09-05', '2026-09-09'])).toBe(4);
  });

  it('clamps an implausible gap into the rotation range', () => {
    expect(restPattern(['2026-06-01', '2026-09-01'])).toBe(
      START_PROJECTION.maxRestDays,
    );
  });

  it('falls back to the default without enough history', () => {
    expect(restPattern(['2026-09-01'])).toBe(START_PROJECTION.restDays);
    expect(restPattern([])).toBe(START_PROJECTION.restDays);
  });
});

describe('projectStarts', () => {
  it('projects the next turn off a confirmed start', () => {
    const starts = projectStarts({
      confirmed: [confirmed('2026-09-16')],
      teamGames: games(['2026-09-16', '2026-09-21']),
      lastStart: null,
      restDays: 5,
      endDate: '2026-09-22',
    });

    expect(starts).toHaveLength(2);
    expect(starts[1]).toMatchObject({
      date: '2026-09-21',
      confidence: START_CONFIDENCE.projected,
    });
  });

  it('slides a projection onto a real game when the turn falls on an off day', () => {
    const starts = projectStarts({
      confirmed: [confirmed('2026-09-16')],
      teamGames: games(['2026-09-16', '2026-09-22']),
      lastStart: null,
      restDays: 5,
      endDate: '2026-09-23',
    });

    expect(starts[1].date).toBe('2026-09-22');
  });

  it('stops rather than projecting onto a team off day beyond the slack', () => {
    const starts = projectStarts({
      confirmed: [confirmed('2026-09-16')],
      teamGames: games(['2026-09-16', '2026-09-26']),
      lastStart: null,
      restDays: 5,
      endDate: '2026-09-27',
    });

    expect(starts).toHaveLength(1);
  });

  it('projects from a past start when nothing is announced yet', () => {
    const starts = projectStarts({
      confirmed: [],
      teamGames: games(['2026-09-20', '2026-09-25']),
      lastStart: '2026-09-15',
      restDays: 5,
      endDate: '2026-09-26',
    });

    expect(starts.map(({ date }) => date)).toEqual([
      '2026-09-20',
      '2026-09-25',
    ]);
    expect(
      starts.every(
        ({ confidence }) => confidence === START_CONFIDENCE.projected,
      ),
    ).toBe(true);
  });

  it('never projects past the end of the window', () => {
    const starts = projectStarts({
      confirmed: [confirmed('2026-09-16')],
      teamGames: games(['2026-09-16', '2026-09-21', '2026-09-26']),
      lastStart: null,
      restDays: 5,
      endDate: '2026-09-21',
    });

    expect(starts.map(({ date }) => date)).toEqual([
      '2026-09-16',
      '2026-09-21',
    ]);
  });

  it('does not double-book a date already claimed by a confirmed start', () => {
    const starts = projectStarts({
      confirmed: [confirmed('2026-09-16'), confirmed('2026-09-21')],
      teamGames: games(['2026-09-16', '2026-09-21', '2026-09-26']),
      lastStart: null,
      restDays: 5,
      endDate: '2026-09-27',
    });

    expect(starts.map(({ date, confidence }) => [date, confidence])).toEqual([
      ['2026-09-16', START_CONFIDENCE.confirmed],
      ['2026-09-21', START_CONFIDENCE.confirmed],
      ['2026-09-26', START_CONFIDENCE.projected],
    ]);
  });

  it('returns nothing when there is no start to project from', () => {
    expect(
      projectStarts({
        confirmed: [],
        teamGames: games(['2026-09-20']),
        lastStart: null,
        restDays: 5,
        endDate: '2026-09-26',
      }),
    ).toEqual([]);
  });
});
