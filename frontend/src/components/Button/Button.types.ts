import type { ButtonHTMLAttributes } from 'react';
import type { BUTTON_VARIANTS } from './Button.constants';

export type ButtonVariant =
  (typeof BUTTON_VARIANTS)[keyof typeof BUTTON_VARIANTS];

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}
