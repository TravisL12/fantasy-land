import { useMemo, useState } from 'react';
import type { DashboardColumn, TableWidget } from '@/api/dashboards';
import type { DashboardRow } from '../../DashboardView.types';
import { compareValues, getPath } from '../../DashboardView.utils';

/** Sorting is local to the table — the rows are already in memory. */
export const useSortedRows = (widget: TableWidget, rows: DashboardRow[]) => {
  const [sort, setSort] = useState(widget.sort);

  const sorted = useMemo(() => {
    const column = widget.columns.find(
      (candidate: DashboardColumn) => candidate.key === sort?.key,
    );
    if (!sort || !column) return rows;

    const direction = sort.order === 'asc' ? 1 : -1;
    return [...rows].sort(
      (a, b) =>
        direction *
        compareValues(getPath(a.data, column.path), getPath(b.data, column.path)),
    );
  }, [rows, sort, widget.columns]);

  const toggleSort = (key: string) =>
    setSort((previous) =>
      previous?.key === key
        ? { key, order: previous.order === 'desc' ? 'asc' : 'desc' }
        : { key, order: 'desc' },
    );

  return { rows: sorted, sort, toggleSort };
};
