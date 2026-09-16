import { useCallback, useEffect } from 'react';
import { useRunDashboardMutation, type DashboardSpec } from '@/api/dashboards';
import { getApiErrorMessage } from '@/utils';
import type { DashboardRunState } from './DashboardView.types';

/**
 * Fetches every source in the spec, and again on demand. A saved dashboard
 * stores only its spec, so opening one always shows current data.
 */
export const useDashboardRun = (spec: DashboardSpec): DashboardRunState => {
  const [runDashboard, { data, isLoading, error }] = useRunDashboardMutation();

  const refresh = useCallback(() => {
    void runDashboard(spec);
  }, [runDashboard, spec]);

  useEffect(refresh, [refresh]);

  return {
    run: data,
    isFetching: isLoading,
    error: error ? getApiErrorMessage(error) : undefined,
    refresh,
  };
};
