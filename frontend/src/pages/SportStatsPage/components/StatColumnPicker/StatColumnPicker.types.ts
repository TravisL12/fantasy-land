import type { StatDefinition } from '@/api/sports';

export interface StatColumnPickerProps {
  stats: StatDefinition[];
  selectedKeys: string[];
  onToggle: (stat: string) => void;
  onReset: () => void;
}

export interface ChipProps {
  $selected: boolean;
}
