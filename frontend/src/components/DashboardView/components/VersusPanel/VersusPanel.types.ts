import type { VersusWidget } from '@/api/dashboards';

export interface VersusPanelProps {
  widget: VersusWidget;
  rows: Record<string, unknown>[];
}
