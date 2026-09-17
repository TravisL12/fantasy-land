import type { DashboardColumn } from '@/api/dashboards';
import { ALIGN, type DataTableColumn } from '@/components/DataTable';
import type { DashboardRow } from '../../DashboardView.types';
import { formatCell, getPath } from '../../DashboardView.utils';

/** A spec column, turned into the table column that renders it. */
export const toColumn = (
  column: DashboardColumn,
): DataTableColumn<DashboardRow> => ({
  key: column.key,
  header: column.header,
  align: column.align ?? (column.format ? ALIGN.right : ALIGN.left),
  sortable: column.sortable ?? true,
  highlight: column.highlight,
  render: ({ data }) => formatCell(getPath(data, column.path), column.format),
});
