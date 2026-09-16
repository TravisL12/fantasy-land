import type { BadgesWidget } from '@/api/dashboards';

export interface BadgeListProps {
  widget: BadgesWidget;
  rows: Record<string, unknown>[];
}
