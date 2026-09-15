import type { SelectOption } from '@/components/Select';

export interface SegmentedControlProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}

export interface SegmentProps {
  $active: boolean;
}
