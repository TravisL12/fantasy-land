import { ROUTES } from '@/router/routes.constants';

export const SPORT_PAGE_COPY = {
  title: (league: string) => `${league}`,
  subtitle: (source: string, seasons: number) =>
    `${seasons} seasons cached locally from ${source}.`,
  back: { to: ROUTES.sports, label: 'All sports' },
  loading: 'Loading…',
  notFound: 'That sport isn’t available.',
} as const;
