import { useState } from 'react';
import {
  type Availability,
  type DirectoryPlayer,
  useGetPlayerDirectoryQuery,
} from '@/api/sports';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Select } from '@/components/Select';
import { SportView } from '@/components/SportView';
import { TextField } from '@/components/TextField';
import { useDebouncedCallback, useSearchParamsState } from '@/hooks';
import { useSportContext } from '@/pages/SportPage';
import { buildPlayerStatsPath } from '@/router/routes.constants';
import { EMPTY_STAT } from '@/utils';
import {
  AVAILABILITY_LABELS,
  PLAYERS_COPY,
  PLAYERS_PAGE_SIZE,
  PLAYER_PARAMS,
  SEARCH_DEBOUNCE_MS,
} from './SportPlayersPage.constants';
import { PlayerLink } from './SportPlayersPage.styles';

const { columns: COLUMNS } = PLAYERS_COPY;

/** The whole local player list, searchable — stats or no stats. */
export const SportPlayersPage = () => {
  const { catalog } = useSportContext();
  const { params, update } = useSearchParamsState();

  const search = params.get(PLAYER_PARAMS.search) ?? '';
  const position = params.get(PLAYER_PARAMS.position) ?? '';
  const availability = params.get(PLAYER_PARAMS.availability) ?? '';
  const page = Math.max(1, Number(params.get(PLAYER_PARAMS.page)) || 1);

  const [searchInput, setSearchInput] = useState(search);
  const commitSearch = useDebouncedCallback(
    (value: string) =>
      update({ [PLAYER_PARAMS.search]: value, [PLAYER_PARAMS.page]: null }),
    SEARCH_DEBOUNCE_MS,
  );

  const offset = (page - 1) * PLAYERS_PAGE_SIZE;
  const { data, error, isFetching } = useGetPlayerDirectoryQuery({
    sport: catalog.key,
    search: search || undefined,
    position: position || undefined,
    availability: availability ? [availability as Availability] : undefined,
    limit: PLAYERS_PAGE_SIZE,
    offset,
  });

  const columns: DataTableColumn<DirectoryPlayer>[] = [
    {
      key: 'name',
      header: COLUMNS.player,
      sticky: true,
      render: (row) => (
        <PlayerLink to={buildPlayerStatsPath(catalog.key, row.id)}>
          {row.name}
        </PlayerLink>
      ),
    },
    { key: 'team', header: COLUMNS.team, render: (row) => row.team ?? 'FA' },
    {
      key: 'position',
      header: COLUMNS.position,
      render: (row) => row.position ?? EMPTY_STAT,
    },
    { key: 'status', header: COLUMNS.status, render: (row) => row.status ?? EMPTY_STAT },
    {
      key: 'availability',
      header: COLUMNS.availability,
      render: (row) => AVAILABILITY_LABELS[row.availability],
    },
  ];

  const positions = catalog.groups.flatMap(({ positions: list }) => list);

  return (
    <SportView
      explainer={PLAYERS_COPY.explainer}
      error={error}
      toolbar={
        <>
          <TextField
            label={PLAYERS_COPY.searchLabel}
            placeholder={PLAYERS_COPY.searchPlaceholder}
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              commitSearch(event.target.value);
            }}
          />
          <Select
            label={PLAYERS_COPY.positionLabel}
            value={position}
            options={[
              { value: '', label: PLAYERS_COPY.all },
              ...positions.map((value) => ({ value, label: value })),
            ]}
            onChange={(value) =>
              update({
                [PLAYER_PARAMS.position]: value,
                [PLAYER_PARAMS.page]: null,
              })
            }
          />
          <Select
            label={PLAYERS_COPY.availabilityLabel}
            value={availability}
            options={[
              { value: '', label: PLAYERS_COPY.all },
              ...Object.entries(AVAILABILITY_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
            onChange={(value) =>
              update({
                [PLAYER_PARAMS.availability]: value,
                [PLAYER_PARAMS.page]: null,
              })
            }
          />
        </>
      }
    >
      <DataTable
        caption={PLAYERS_COPY.caption}
        columns={columns}
        rows={data?.players ?? []}
        getRowKey={(row) => row.id}
        emptyMessage={PLAYERS_COPY.empty}
        isFetching={isFetching}
      />
      <Pagination
        page={page}
        pageSize={PLAYERS_PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={(next) => update({ [PLAYER_PARAMS.page]: next })}
      />
    </SportView>
  );
};
