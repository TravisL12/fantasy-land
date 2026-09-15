import type { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'onChange'
> {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}
