import { useId } from 'react';
import { Field, Hint, Input, Label } from './TextField.styles';
import type { TextFieldProps } from './TextField.types';

export const TextField = ({
  label,
  hint,
  id,
  ...inputProps
}: TextFieldProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <Field>
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} aria-describedby={hintId} {...inputProps} />
      {hint && <Hint id={hintId}>{hint}</Hint>}
    </Field>
  );
};
