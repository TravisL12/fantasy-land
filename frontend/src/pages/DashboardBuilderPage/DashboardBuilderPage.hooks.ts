import { skipToken } from '@reduxjs/toolkit/query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { ChatMessage } from '@/api/chat';
import {
  DASHBOARD_EVENTS,
  streamDashboardBuild,
  useCreateDashboardMutation,
  useGetDashboardQuery,
  useUpdateDashboardMutation,
  type DashboardSpec,
  type DashboardStreamEvent,
} from '@/api/dashboards';
import { useChatStream } from '@/hooks';
import { buildDashboardPath } from '@/router/routes.constants';
import { getApiErrorMessage } from '@/utils';
import { collectPrompt } from './DashboardBuilderPage.utils';

/**
 * The builder conversation. It is the ordinary chat loop; the only differences
 * are that one of the model's tools hands back a spec, which lands here as an
 * event, and that the spec on screen rides along with every message so the
 * model refines the dashboard instead of rebuilding it from the words alone.
 *
 * With a dashboard id in the route it edits that dashboard; without one it
 * creates a new one. Both end in the same place: the saved dashboard.
 */
export const useDashboardBuilder = () => {
  const { dashboardId } = useParams();
  const {
    data: dashboard,
    isLoading,
    error: loadError,
  } = useGetDashboardQuery(dashboardId ?? skipToken);

  const [spec, setSpec] = useState<DashboardSpec>();
  // Bumped per build so the preview remounts — and drops its selection — when
  // the model replaces the dashboard rather than refining it.
  const [buildId, setBuildId] = useState(0);
  const [createDashboard, { isLoading: isCreating, error: createError }] =
    useCreateDashboardMutation();
  const [updateDashboard, { isLoading: isUpdating, error: updateError }] =
    useUpdateDashboardMutation();
  const navigate = useNavigate();

  // Seeded once: saving refetches the dashboard, and that must not throw away
  // the refinement the user is still working on.
  const seeded = useRef(false);
  useEffect(() => {
    if (!dashboard || seeded.current) return;
    seeded.current = true;
    setSpec(dashboard.spec);
  }, [dashboard]);

  // The stream callback has to stay stable while the spec it sends does not.
  const specRef = useRef<DashboardSpec>(undefined);
  useEffect(() => {
    specRef.current = spec;
  }, [spec]);

  const stream = useCallback(
    (messages: ChatMessage[], signal: AbortSignal) =>
      streamDashboardBuild(messages, signal, specRef.current),
    [],
  );

  const onEvent = useCallback((event: DashboardStreamEvent) => {
    if (event.type !== DASHBOARD_EVENTS.spec) return;
    setSpec(event.spec);
    setBuildId((previous) => previous + 1);
  }, []);

  const chat = useChatStream(stream, onEvent);
  const { turns } = chat;

  const save = useCallback(async () => {
    if (!spec) return;
    const prompt = collectPrompt(dashboard?.prompt, turns);
    const saved = await (dashboardId
      ? updateDashboard({ id: dashboardId, spec, prompt }).unwrap()
      : createDashboard({ spec, prompt }).unwrap());
    await navigate(buildDashboardPath(saved.id));
  }, [
    createDashboard,
    dashboard,
    dashboardId,
    navigate,
    spec,
    turns,
    updateDashboard,
  ]);

  return {
    ...chat,
    dashboardId,
    dashboard,
    isLoading,
    loadError: getApiErrorMessage(loadError),
    spec,
    buildId,
    save,
    isSaving: isCreating || isUpdating,
    saveError: getApiErrorMessage(createError ?? updateError),
  };
};
