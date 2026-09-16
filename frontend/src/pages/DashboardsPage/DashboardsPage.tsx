import {
  useDeleteDashboardMutation,
  useGetDashboardsQuery,
  type Dashboard,
} from '@/api/dashboards';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { ROUTES } from '@/router/routes.constants';
import { getApiErrorMessage } from '@/utils';
import { useNavigate } from 'react-router';
import { DashboardCard } from './components/DashboardCard';
import { DASHBOARDS_COPY } from './DashboardsPage.constants';
import { Actions, Grid } from './DashboardsPage.styles';

export const DashboardsPage = () => {
  const { data: dashboards, isLoading, error } = useGetDashboardsQuery();
  const [deleteDashboard] = useDeleteDashboardMutation();
  const navigate = useNavigate();

  const remove = (dashboard: Dashboard) => {
    if (window.confirm(DASHBOARDS_COPY.confirmRemove(dashboard.title))) {
      void deleteDashboard(dashboard.id);
    }
  };

  return (
    <>
      <PageHeader
        title={DASHBOARDS_COPY.heading}
        subtitle={DASHBOARDS_COPY.subheading}
      />
      <Actions>
        <Button onClick={() => void navigate(ROUTES.dashboardCreate)}>
          {DASHBOARDS_COPY.create}
        </Button>
      </Actions>

      {isLoading && <StatusMessage>{DASHBOARDS_COPY.loading}</StatusMessage>}
      {error && (
        <StatusMessage variant={STATUS_VARIANTS.error}>
          {getApiErrorMessage(error)}
        </StatusMessage>
      )}
      {dashboards?.length === 0 && (
        <StatusMessage>{DASHBOARDS_COPY.empty}</StatusMessage>
      )}

      <Grid>
        {dashboards?.map((dashboard) => (
          <DashboardCard
            key={dashboard.id}
            dashboard={dashboard}
            onRemove={remove}
          />
        ))}
      </Grid>
    </>
  );
};
