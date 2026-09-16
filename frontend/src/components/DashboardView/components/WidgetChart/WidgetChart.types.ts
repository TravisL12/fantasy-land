import type { ChartWidget, DashboardRun } from '@/api/dashboards';

export interface WidgetChartProps {
  widget: ChartWidget;
  run?: DashboardRun;
}
