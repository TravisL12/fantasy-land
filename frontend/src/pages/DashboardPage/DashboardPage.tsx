import { useParams } from 'react-router';
import { useGetDashboardQuery } from '@/api/dashboards';
import { DashboardView } from '@/components/DashboardView';
import { PageHeader } from '@/components/PageHeader';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { ROUTES } from '@/router/routes.constants';
import { getApiErrorMessage } from '@/utils';
import { DASHBOARD_COPY } from './DashboardPage.constants';

export const DashboardPage = () => {
  const { dashboardId = '' } = useParams();
  const { data: dashboard, isLoading, error } = useGetDashboardQuery(dashboardId);

  if (isLoading) return <StatusMessage>{DASHBOARD_COPY.loading}</StatusMessage>;

  if (error || !dashboard) {
    return (
      <StatusMessage variant={STATUS_VARIANTS.error}>
        {getApiErrorMessage(error) ?? DASHBOARD_COPY.missing}
      </StatusMessage>
    );
  }

  return (
    <>
      <PageHeader
        title={dashboard.title}
        back={{ to: ROUTES.dashboards, label: DASHBOARD_COPY.back }}
      />
      <DashboardView spec={dashboard.spec} />
    </>
  );
};
