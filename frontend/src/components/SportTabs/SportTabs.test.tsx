import { screen } from '@testing-library/react';
import type { SportCatalog } from '@/api/sports';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SportTabs } from './SportTabs';

const catalog = (
  capabilities: Partial<SportCatalog['capabilities']> = {},
): SportCatalog =>
  ({
    key: 'nfl',
    league: 'NFL',
    capabilities: {
      schedule: false,
      standings: false,
      leagueData: false,
      expectedPoints: false,
      playerDirectory: false,
      ...capabilities,
    },
  }) as SportCatalog;

describe('SportTabs', () => {
  it('always offers the leaderboard', () => {
    renderWithProviders(<SportTabs catalog={catalog()} />);

    expect(screen.getByRole('link', { name: 'Leaderboard' })).toBeVisible();
  });

  it('hides views the sport has no data for', () => {
    renderWithProviders(<SportTabs catalog={catalog()} />);

    // A tab that leads to "this sport does not support that" is worse than none.
    expect(screen.queryByRole('link', { name: 'Expected points' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Matchups' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Players' })).toBeNull();
  });

  it('offers the expected-points and directory views when the sport has them', () => {
    renderWithProviders(
      <SportTabs
        catalog={catalog({ expectedPoints: true, playerDirectory: true })}
      />,
    );

    expect(screen.getByRole('link', { name: 'Expected points' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Players' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Schedule' })).toBeNull();
  });

  it('offers the league-data views together, since one capability covers them', () => {
    renderWithProviders(
      <SportTabs catalog={catalog({ schedule: true, leagueData: true })} />,
    );

    for (const label of ['Schedule', 'Starts', 'Matchups', 'Availability']) {
      expect(screen.getByRole('link', { name: label })).toBeVisible();
    }
  });

  /**
   * A fixture list is the narrower capability: a sport can have a schedule
   * without the team stats the other three views are built on.
   */
  it('offers the schedule alone to a sport with fixtures but no team stats', () => {
    renderWithProviders(<SportTabs catalog={catalog({ schedule: true })} />);

    expect(screen.getByRole('link', { name: 'Schedule' })).toBeVisible();
    for (const label of ['Starts', 'Matchups', 'Availability']) {
      expect(screen.queryByRole('link', { name: label })).toBeNull();
    }
  });

  it('points each tab at that sport', () => {
    renderWithProviders(
      <SportTabs catalog={catalog({ schedule: true, leagueData: true })} />,
    );

    expect(screen.getByRole('link', { name: 'Matchups' })).toHaveAttribute(
      'href',
      '/sports/nfl/matchups',
    );
    expect(screen.getByRole('link', { name: 'Leaderboard' })).toHaveAttribute(
      'href',
      '/sports/nfl',
    );
  });
});
