import type { ReactNode } from 'react';
import type { TextFieldProps } from '@/components/TextField';

export interface AuthFormField<TName extends string> extends Omit<
  TextFieldProps,
  'name' | 'value' | 'onChange'
> {
  name: TName;
}

export type AuthFormValues<TName extends string> = Record<TName, string>;

export interface AuthFormProps<TName extends string> {
  title: string;
  fields: readonly AuthFormField<TName>[];
  submitLabel: string;
  submittingLabel: string;
  isSubmitting: boolean;
  error?: string;
  footer: ReactNode;
  onSubmit: (values: AuthFormValues<TName>) => void;
}
