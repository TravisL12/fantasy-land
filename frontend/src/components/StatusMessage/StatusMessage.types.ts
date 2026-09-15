import type { ReactNode } from 'react';
import type { STATUS_VARIANTS } from './StatusMessage.constants';

export type StatusVariant =
  (typeof STATUS_VARIANTS)[keyof typeof STATUS_VARIANTS];

export interface StatusMessageProps {
  variant?: StatusVariant;
  children: ReactNode;
}
