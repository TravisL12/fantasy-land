import { BUTTON_VARIANTS, Button } from '@/components/Button';
import { buildDashboardPath } from '@/router/routes.constants';
import { DASHBOARDS_COPY } from '../../DashboardsPage.constants';
import { Card, Description, Footer, Title } from './DashboardCard.styles';
import type { DashboardCardProps } from './DashboardCard.types';

export const DashboardCard = ({ dashboard, onRemove }: DashboardCardProps) => (
  <Card>
    <Title to={buildDashboardPath(dashboard.id)}>{dashboard.title}</Title>
    {dashboard.description && <Description>{dashboard.description}</Description>}
    <Footer>
      <span>
        {DASHBOARDS_COPY.updated(
          new Date(dashboard.updatedAt).toLocaleDateString(),
        )}
      </span>
      <Button variant={BUTTON_VARIANTS.ghost} onClick={() => onRemove(dashboard)}>
        {DASHBOARDS_COPY.remove}
      </Button>
    </Footer>
  </Card>
);
