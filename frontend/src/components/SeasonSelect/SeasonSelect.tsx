import { Select } from '@/components/Select';
import { SEASON_LABEL } from './SeasonSelect.constants';
import type { SeasonSelectProps } from './SeasonSelect.types';

/** Every sport view is season-scoped, so they all need the same picker. */
export const SeasonSelect = ({
  catalog,
  value,
  onChange,
}: SeasonSelectProps) => (
  <Select
    label={SEASON_LABEL}
    value={value ?? catalog.defaultSeason}
    options={catalog.seasons.map((season) => ({
      value: season,
      label: season,
    }))}
    onChange={onChange}
  />
);
