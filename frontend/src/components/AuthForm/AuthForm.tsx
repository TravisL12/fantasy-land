import { type ChangeEvent, type FormEvent, useState } from 'react';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Card, ErrorBanner, Footer, Title } from './AuthForm.styles';
import type { AuthFormProps, AuthFormValues } from './AuthForm.types';

export const AuthForm = <TName extends string>({
  title,
  fields,
  submitLabel,
  submittingLabel,
  isSubmitting,
  error,
  footer,
  onSubmit,
}: AuthFormProps<TName>) => {
  const [values, setValues] = useState(
    () =>
      Object.fromEntries(
        fields.map(({ name }) => [name, '']),
      ) as AuthFormValues<TName>,
  );

  const handleChange = ({ target }: ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [target.name]: target.value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <Card onSubmit={handleSubmit}>
      <Title>{title}</Title>
      {error && <ErrorBanner role="alert">{error}</ErrorBanner>}
      {fields.map((field) => (
        <TextField
          key={field.name}
          {...field}
          value={values[field.name]}
          onChange={handleChange}
        />
      ))}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
      {footer && <Footer>{footer}</Footer>}
    </Card>
  );
};
