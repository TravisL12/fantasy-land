import type { WidgetType } from '@/api/dashboards';

/** One widget kind, described for someone deciding what to ask for. */
export interface WidgetGuideEntry {
  type: WidgetType;
  title: string;
  summary: string;
  /** What the model has to point it at for the widget to render. */
  needs: string;
  ask: string;
}

export interface FormatGuideEntry {
  format: string;
  summary: string;
  example: string;
}
