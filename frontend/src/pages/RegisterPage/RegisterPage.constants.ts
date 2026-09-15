import type { AuthFormField } from '@/components/AuthForm';

export const REGISTER_COPY = {
  title: 'Create your account',
  submit: 'Sign up',
  submitting: 'Creating account…',
  footerPrompt: 'Already have an account?',
  footerLink: 'Log in',
} as const;

// Mirrors the backend RegisterDto rules so most mistakes are caught before submit.
export const REGISTER_FIELDS = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    autoComplete: 'email',
    required: true,
  },
  {
    name: 'username',
    label: 'Username',
    autoComplete: 'username',
    required: true,
    minLength: 3,
    maxLength: 24,
    pattern: '[A-Za-z0-9_]+',
    hint: '3–24 characters: letters, numbers, underscores',
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    autoComplete: 'new-password',
    required: true,
    minLength: 8,
    maxLength: 128,
    hint: 'At least 8 characters',
  },
] as const satisfies readonly AuthFormField<string>[];
