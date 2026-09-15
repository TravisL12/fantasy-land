import { BUTTON_VARIANTS, Button } from '@/components/Button';
import { COLUMN_PICKER_COPY } from './StatColumnPicker.constants';
import {
  Actions,
  Body,
  Chip,
  Chips,
  Hint,
  Panel,
  Summary,
} from './StatColumnPicker.styles';
import type { StatColumnPickerProps } from './StatColumnPicker.types';

export const StatColumnPicker = ({
  stats,
  selectedKeys,
  onToggle,
  onReset,
}: StatColumnPickerProps) => (
  <Panel>
    <Summary>{COLUMN_PICKER_COPY.toggle(selectedKeys.length)}</Summary>
    <Body>
      <Hint>{COLUMN_PICKER_COPY.hint}</Hint>
      <Chips>
        {stats.map((stat) => {
          const selected = selectedKeys.includes(stat.key);
          return (
            <Chip
              key={stat.key}
              type="button"
              aria-pressed={selected}
              title={stat.abbr}
              $selected={selected}
              onClick={() => onToggle(stat.key)}
            >
              {stat.label}
            </Chip>
          );
        })}
      </Chips>
      <Actions>
        <Button variant={BUTTON_VARIANTS.ghost} onClick={onReset}>
          {COLUMN_PICKER_COPY.reset}
        </Button>
      </Actions>
    </Body>
  </Panel>
);
