import { useState } from 'react';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Select } from '@/components/Select';
import { TextField } from '@/components/TextField';
import { useDebouncedCallback } from '@/hooks';
import { SEARCH_DEBOUNCE_MS } from '../../SportStatsPage.constants';
import {
  ALL_LABELS,
  ALL_OPTION,
  KIND_LABELS,
  MIN_GAMES_OPTIONS,
  minGamesLabel,
  TOOLBAR_LABELS,
  weekLabel,
} from './StatsToolbar.constants';
import { Search, Segments, Toolbar } from './StatsToolbar.styles';
import type { StatsToolbarProps } from './StatsToolbar.types';

export const StatsToolbar = ({
  catalog,
  filters,
  onChange,
  onGroupChange,
}: StatsToolbarProps) => {
  const [search, setSearch] = useState(filters.search);
  const commitSearch = useDebouncedCallback(
    (value: string) => onChange({ search: value }),
    SEARCH_DEBOUNCE_MS,
  );

  return (
    <Toolbar>
      <Segments>
        <SegmentedControl
          label={TOOLBAR_LABELS.group}
          value={filters.group.key}
          options={catalog.groups.map((g) => ({
            value: g.key,
            label: g.label,
          }))}
          onChange={onGroupChange}
        />
        {catalog.dataKinds.length > 1 && (
          <SegmentedControl
            label={TOOLBAR_LABELS.kind}
            value={filters.kind}
            options={catalog.dataKinds.map((kind) => ({
              value: kind,
              label: KIND_LABELS[kind],
            }))}
            onChange={(kind) => onChange({ kind })}
          />
        )}
      </Segments>
      <Select
        label={TOOLBAR_LABELS.season}
        value={filters.season}
        options={catalog.seasons.map((season) => ({
          value: season,
          label: season,
        }))}
        onChange={(season) => onChange({ season })}
      />
      {catalog.weeks && (
        <Select
          label={TOOLBAR_LABELS.week}
          value={filters.week ? String(filters.week) : ALL_OPTION}
          options={[
            { value: ALL_OPTION, label: ALL_LABELS.week },
            ...catalog.weeks.map((week) => ({
              value: String(week),
              label: weekLabel(week),
            })),
          ]}
          onChange={(week) => onChange({ week })}
        />
      )}
      <Select
        label={TOOLBAR_LABELS.position}
        value={filters.position ?? ALL_OPTION}
        options={[
          { value: ALL_OPTION, label: ALL_LABELS.position },
          ...filters.group.positions.map((p) => ({ value: p, label: p })),
        ]}
        onChange={(position) => onChange({ position })}
      />
      <Select
        label={TOOLBAR_LABELS.scoring}
        value={filters.scoring}
        options={catalog.scoringPresets.map((p) => ({
          value: p.key,
          label: p.label,
        }))}
        onChange={(scoring) => onChange({ scoring })}
      />
      <Select
        label={TOOLBAR_LABELS.minGames}
        value={filters.minGames ? String(filters.minGames) : ALL_OPTION}
        options={[
          { value: ALL_OPTION, label: ALL_LABELS.minGames },
          ...MIN_GAMES_OPTIONS.map((n) => ({
            value: String(n),
            label: minGamesLabel(n),
          })),
        ]}
        onChange={(minGames) => onChange({ minGames })}
      />
      <Search>
        <TextField
          label={TOOLBAR_LABELS.search}
          type="search"
          placeholder={TOOLBAR_LABELS.searchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            commitSearch(e.target.value);
          }}
        />
      </Search>
    </Toolbar>
  );
};
