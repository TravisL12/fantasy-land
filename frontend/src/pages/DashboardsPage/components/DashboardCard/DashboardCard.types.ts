import type { Dashboard } from '@/api/dashboards';

export interface DashboardCardProps {
  dashboard: Dashboard;
  onRemove: (dashboard: Dashboard) => void;
}
