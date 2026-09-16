import { useCallback, useState } from 'react';
import {
  DASHBOARD_EVENTS,
  streamDashboardBuild,
  useCreateDashboardMutation,
  type DashboardSpec,
  type DashboardStreamEvent,
} from '@/api/dashboards';
import { useChatStream } from '@/hooks';
import { buildDashboardPath } from '@/router/routes.constants';
import { getApiErrorMessage } from '@/utils';
import { useNavigate } from 'react-router';

/**
 * The builder conversation. It is the ordinary chat loop; the only difference is
 * that one of the model's tools hands back a spec, which lands here as an event.
 */
export const useDashboardBuilder = () => {
  const [spec, setSpec] = useState<DashboardSpec>();
  // Bumped per build so the preview remounts — and drops its selection — when
  // the model replaces the dashboard rather than refining it.
  const [buildId, setBuildId] = useState(0);
  const [createDashboard, { isLoading: isSaving, error: saveError }] =
    useCreateDashboardMutation();
  const navigate = useNavigate();

  const onEvent = useCallback((event: DashboardStreamEvent) => {
    if (event.type !== DASHBOARD_EVENTS.spec) return;
    setSpec(event.spec);
    setBuildId((previous) => previous + 1);
  }, []);

  const chat = useChatStream(streamDashboardBuild, onEvent);

  const save = useCallback(async () => {
    if (!spec) return;
    const saved = await createDashboard(spec).unwrap();
    await navigate(buildDashboardPath(saved.id));
  }, [createDashboard, navigate, spec]);

  return {
    ...chat,
    spec,
    buildId,
    save,
    isSaving,
    saveError: getApiErrorMessage(saveError),
  };
};
