import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable.types';

interface Row {
  name: string;
  points: number;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Player', align: 'left', render: (r) => r.name },
  {
    key: 'points',
    header: 'FPTS',
    sortable: true,
    render: (r) => r.points,
    footer: 30,
  },
];

describe('DataTable', () => {
  it('renders rows, a footer, and sort state', () => {
    const onSort = vi.fn();
    renderWithProviders(
      <DataTable
        caption="Leaders"
        columns={columns}
        rows={[
          { name: 'Alpha', points: 20 },
          { name: 'Bravo', points: 10 },
        ]}
        getRowKey={(r) => r.name}
        sort={{ key: 'points', order: 'desc' }}
        onSort={onSort}
        emptyMessage="Nothing here"
      />,
    );

    const table = screen.getByRole('table', { name: 'Leaders' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(screen.getByRole('columnheader', { name: /FPTS/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    fireEvent.click(screen.getByRole('button', { name: /FPTS/ }));
    expect(onSort).toHaveBeenCalledWith('points');
  });

  it('shows the empty message', () => {
    renderWithProviders(
      <DataTable
        caption="Leaders"
        columns={columns}
        rows={[]}
        getRowKey={(r) => r.name}
        emptyMessage="Nothing here"
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
