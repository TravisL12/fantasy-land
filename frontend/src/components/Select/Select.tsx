import { Control, Field } from './Select.styles';
import type { SelectProps } from './Select.types';

export const Select = ({
  label,
  options,
  value,
  onChange,
  ...rest
}: SelectProps) => (
  <Field>
    {label}
    <Control value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Control>
  </Field>
);
