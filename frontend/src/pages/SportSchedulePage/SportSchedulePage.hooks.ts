import { useGetScheduleQuery } from '@/api/sports';
import { useSearchParamsState } from '@/hooks';
import { useSportContext } from '@/pages/SportPage';
import { SCHEDULE_PARAMS } from './SportSchedulePage.constants';
import type { ScheduleView } from './SportSchedulePage.types';

/**
 * The window a schedule is asked for, read from the URL. Weeks and dates
 * filter each other, so the API takes one or the other: a sport with weeks is
 * asked by week, and everything else by date.
 */
export const useSchedule = () => {
  const { catalog } = useSportContext();
  const { params, update } = useSearchParamsState();

  const { weeks } = catalog;
  const season = params.get(SCHEDULE_PARAMS.season) ?? undefined;
  const week = params.get(SCHEDULE_PARAMS.week) ?? '';
  const startDate = params.get(SCHEDULE_PARAMS.startDate) ?? undefined;
  const endDate = params.get(SCHEDULE_PARAMS.endDate) ?? undefined;

  const { data, error, isFetching } = useGetScheduleQuery(
    weeks && week
      ? { sport: catalog.key, season, weeks: [Number(week)] }
      : { sport: catalog.key, season, startDate, endDate },
  );

  const view: ScheduleView = {
    season,
    week,
    // The window the API resolved to is the answer until someone narrows it.
    startDate: startDate ?? data?.startDate,
    endDate: endDate ?? data?.endDate,
    weeks,
    showDates: !week,
    hasStarters: (data?.games ?? []).some(
      ({ probables }) => probables.home || probables.away,
    ),
  };

  return { catalog, view, update, data, error, isFetching };
};
