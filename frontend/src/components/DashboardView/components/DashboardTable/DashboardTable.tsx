import { useMemo } from 'react';
import { BUTTON_VARIANTS, Button } from '@/components/Button';
import { ALIGN, DataTable } from '@/components/DataTable';
import { DASHBOARD_VIEW_COPY } from '../../DashboardView.constants';
import type { DashboardRow } from '../../DashboardView.types';
import { SELECT_COLUMN_KEY } from './DashboardTable.constants';
import { useSortedRows } from './DashboardTable.hooks';
import { Checkbox, Toolbar } from './DashboardTable.styles';
import type { DashboardTableProps } from './DashboardTable.types';
import { toColumn } from './DashboardTable.utils';

export const DashboardTable = ({
  widget,
  rows,
  selected,
  onToggle,
  onClear,
  isFetching,
}: DashboardTableProps) => {
  const { rows: sorted, sort, toggleSort } = useSortedRows(widget, rows);

  const columns = useMemo(() => {
    const mapped = widget.columns.map(toColumn);
    if (!selected || !onToggle) return mapped;

    return [
      {
        key: SELECT_COLUMN_KEY,
        header: DASHBOARD_VIEW_COPY.pick,
        align: ALIGN.left,
        render: (row: DashboardRow) => (
          <Checkbox
            type="checkbox"
            checked={selected.includes(row.key)}
            onChange={() => onToggle(row.key)}
            aria-label={DASHBOARD_VIEW_COPY.selectRow}
          />
        ),
      },
      ...mapped,
    ];
  }, [onToggle, selected, widget.columns]);

  return (
    <>
      {selected && selected.length > 0 && (
        <Toolbar>
          <span>{DASHBOARD_VIEW_COPY.selected(selected.length)}</span>
          <Button variant={BUTTON_VARIANTS.ghost} onClick={onClear}>
            {DASHBOARD_VIEW_COPY.clear}
          </Button>
        </Toolbar>
      )}
      <DataTable
        caption={widget.title}
        columns={columns}
        rows={sorted}
        getRowKey={(row) => row.key}
        sort={sort}
        onSort={toggleSort}
        emptyMessage={DASHBOARD_VIEW_COPY.empty}
        isFetching={isFetching}
      />
    </>
  );
};
