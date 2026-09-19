import { useState } from 'react';
import {
  type Availability,
  type PlayerStatus,
  useGetAvailabilityQuery,
} from '@/api/sports';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { SeasonSelect } from '@/components/SeasonSelect';
import { Select } from '@/components/Select';
import { SportView } from '@/components/SportView';
import { TextField } from '@/components/TextField';
import { useDebouncedCallback, useSearchParamsState } from '@/hooks';
import { useSportContext } from '@/pages/SportPage';
import { EMPTY_STAT } from '@/utils';
import {
  AVAILABILITY_COPY,
  AVAILABILITY_LABELS,
  AVAILABILITY_PARAMS,
  AVAILABILITY_TONES,
  SEARCH_DEBOUNCE_MS,
} from './SportAvailabilityPage.constants';
import { Chip } from './SportAvailabilityPage.styles';

const { columns: COLUMNS } = AVAILABILITY_COPY;

const columns: DataTableColumn<PlayerStatus>[] = [
  {
    key: 'name',
    header: COLUMNS.player,
    sticky: true,
    render: (row) => row.name,
  },
  { key: 'team', header: COLUMNS.team, render: (row) => row.team ?? EMPTY_STAT },
  {
    key: 'position',
    header: COLUMNS.position,
    render: (row) => row.position ?? EMPTY_STAT,
  },
  { key: 'status', header: COLUMNS.status, render: (row) => row.status },
  {
    key: 'availability',
    header: COLUMNS.availability,
    render: (row) => (
      <Chip $tone={AVAILABILITY_TONES[row.availability]}>
        {AVAILABILITY_LABELS[row.availability]}
      </Chip>
    ),
  },
];

/** Injured lists and roster status, in the shared availability vocabulary. */
export const SportAvailabilityPage = () => {
  const { catalog } = useSportContext();
  const { params, update } = useSearchParamsState();

  const season = params.get(AVAILABILITY_PARAMS.season) ?? undefined;
  const availability = params.get(AVAILABILITY_PARAMS.availability) ?? '';
  const search = params.get(AVAILABILITY_PARAMS.search) ?? '';

  const [searchInput, setSearchInput] = useState(search);
  const commitSearch = useDebouncedCallback(
    (value: string) => update({ [AVAILABILITY_PARAMS.search]: value }),
    SEARCH_DEBOUNCE_MS,
  );

  const { data, error, isFetching } = useGetAvailabilityQuery({
    sport: catalog.key,
    season,
    availability: availability ? [availability as Availability] : undefined,
    search: search || undefined,
  });

  return (
    <SportView
      explainer={AVAILABILITY_COPY.explainer}
      error={error}
      toolbar={
        <>
          <SeasonSelect
            catalog={catalog}
            value={season}
            onChange={(value) => update({ [AVAILABILITY_PARAMS.season]: value })}
          />
          <Select
            label={AVAILABILITY_COPY.statusLabel}
            value={availability}
            options={[
              { value: '', label: AVAILABILITY_COPY.all },
              ...Object.entries(AVAILABILITY_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
            onChange={(value) =>
              update({ [AVAILABILITY_PARAMS.availability]: value })
            }
          />
          <TextField
            label={AVAILABILITY_COPY.searchLabel}
            placeholder={AVAILABILITY_COPY.searchPlaceholder}
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              commitSearch(event.target.value);
            }}
          />
        </>
      }
    >
      <DataTable
        caption={AVAILABILITY_COPY.caption}
        columns={columns}
        rows={data?.players ?? []}
        getRowKey={(row) => row.playerId}
        emptyMessage={AVAILABILITY_COPY.empty}
        isFetching={isFetching}
      />
    </SportView>
  );
};
