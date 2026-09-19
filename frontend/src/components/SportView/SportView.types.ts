import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { ReactNode } from 'react';

export interface SportViewProps {
  /** What the view shows, and what it deliberately leaves out. */
  explainer: ReactNode;
  /** The season picker and whatever else this view filters on. */
  toolbar: ReactNode;
  error?: FetchBaseQueryError | SerializedError;
  /** The table and anything that belongs under it, rendered only on success. */
  children: ReactNode;
}
