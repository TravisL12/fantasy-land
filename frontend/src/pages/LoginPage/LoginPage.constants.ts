import type { AuthFormField } from '@/components/AuthForm';

export const LOGIN_COPY = {
  title: 'Log in',
  submit: 'Log in',
  submitting: 'Logging in…',
} as const;

export const LOGIN_FIELDS = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    autoComplete: 'email',
    required: true,
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    autoComplete: 'current-password',
    required: true,
  },
] as const satisfies readonly AuthFormField<string>[];
