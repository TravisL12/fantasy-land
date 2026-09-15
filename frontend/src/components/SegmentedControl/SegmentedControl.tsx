import { Group, Segment } from './SegmentedControl.styles';
import type { SegmentedControlProps } from './SegmentedControl.types';

export const SegmentedControl = ({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps) => (
  <Group role="radiogroup" aria-label={label}>
    {options.map((option) => (
      <Segment
        key={option.value}
        type="button"
        role="radio"
        aria-checked={option.value === value}
        $active={option.value === value}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </Segment>
    ))}
  </Group>
);
