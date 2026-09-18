import { useCallback, useEffect } from 'react';
import {
  useRunDashboardMutation,
  type DashboardRun,
  type DashboardSpec,
} from '@/api/dashboards';
import { getApiErrorMessage } from '@/utils';
import type { DashboardRunState } from './DashboardView.types';

/**
 * Fetches every source in the spec, and again on demand. A saved dashboard
 * stores only its spec, so opening one always shows current data.
 *
 * A `sample` run short-circuits the fetch: the widget guide renders a spec
 * against data it already holds, so the page documents every widget kind
 * without depending on a live upstream.
 */
export const useDashboardRun = (
  spec: DashboardSpec,
  sample?: DashboardRun,
): DashboardRunState => {
  const [runDashboard, { data, isLoading, error }] = useRunDashboardMutation();

  const refresh = useCallback(() => {
    if (sample) return;
    void runDashboard(spec);
  }, [runDashboard, sample, spec]);

  useEffect(refresh, [refresh]);

  if (sample) return { run: sample, isFetching: false, refresh };

  return {
    run: data,
    isFetching: isLoading,
    error: error ? getApiErrorMessage(error) : undefined,
    refresh,
  };
};
