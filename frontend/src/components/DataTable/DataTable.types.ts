import type { ReactNode } from 'react';
import type { ALIGN } from './DataTable.constants';

export type Align = (typeof ALIGN)[keyof typeof ALIGN];

export interface DataTableColumn<TRow> {
  key: string;
  header: string;
  /** Tooltip for abbreviated headers. */
  title?: string;
  align?: Align;
  sortable?: boolean;
  /** Emphasize the column (e.g. fantasy points). */
  highlight?: boolean;
  /** Pin to the left while scrolling horizontally. */
  sticky?: boolean;
  render: (row: TRow) => ReactNode;
  footer?: ReactNode;
}

export interface DataTableSort {
  key: string;
  order: 'asc' | 'desc';
}

export interface DataTableProps<TRow> {
  caption: string;
  columns: DataTableColumn<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow, index: number) => string;
  sort?: DataTableSort;
  onSort?: (key: string) => void;
  emptyMessage: string;
  isFetching?: boolean;
}

export interface CellProps {
  $align: Align;
  $highlight?: boolean;
  $sticky?: boolean;
}
