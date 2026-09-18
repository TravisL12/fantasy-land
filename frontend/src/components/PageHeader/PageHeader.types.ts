import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  /** Secondary controls sitting beside the title, e.g. a link to the guide. */
  actions?: ReactNode;
}
