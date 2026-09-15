import { ALIGN, SORT_ARROWS } from './DataTable.constants';
import {
  Caption,
  Cell,
  Empty,
  FooterCell,
  HeaderCell,
  Row,
  SortButton,
  Table,
  Wrapper,
} from './DataTable.styles';
import type { DataTableProps } from './DataTable.types';

export const DataTable = <TRow,>({
  caption,
  columns,
  rows,
  getRowKey,
  sort,
  onSort,
  emptyMessage,
  isFetching,
}: DataTableProps<TRow>) => {
  const hasFooter = columns.some((column) => column.footer !== undefined);

  return (
    <Wrapper $isFetching={isFetching} aria-busy={isFetching}>
      <Table>
        <Caption>{caption}</Caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const align = column.align ?? ALIGN.right;
              const active = sort?.key === column.key;
              return (
                <HeaderCell
                  key={column.key}
                  scope="col"
                  title={column.title}
                  $align={align}
                  $highlight={column.highlight}
                  $sticky={column.sticky}
                  aria-sort={
                    active
                      ? sort.order === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  {column.sortable && onSort ? (
                    <SortButton
                      type="button"
                      onClick={() => onSort(column.key)}
                    >
                      {column.header}
                      {active && (
                        <span aria-hidden>{SORT_ARROWS[sort.order]}</span>
                      )}
                    </SortButton>
                  ) : (
                    column.header
                  )}
                </HeaderCell>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <Empty colSpan={columns.length}>{emptyMessage}</Empty>
            </tr>
          ) : (
            rows.map((row, index) => (
              <Row key={getRowKey(row, index)}>
                {columns.map((column) => (
                  <Cell
                    key={column.key}
                    $align={column.align ?? ALIGN.right}
                    $highlight={column.highlight}
                    $sticky={column.sticky}
                  >
                    {column.render(row)}
                  </Cell>
                ))}
              </Row>
            ))
          )}
        </tbody>
        {hasFooter && rows.length > 0 && (
          <tfoot>
            <tr>
              {columns.map((column) => (
                <FooterCell
                  key={column.key}
                  $align={column.align ?? ALIGN.right}
                  $highlight={column.highlight}
                  $sticky={column.sticky}
                >
                  {column.footer}
                </FooterCell>
              ))}
            </tr>
          </tfoot>
        )}
      </Table>
    </Wrapper>
  );
};
