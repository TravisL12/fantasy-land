import styled, { css } from 'styled-components';
import { BUTTON_VARIANTS } from './Button.constants';
import type { ButtonVariant } from './Button.types';

export const StyledButton = styled.button<{ $variant: ButtonVariant }>`
  padding: ${({ theme }) => `${theme.spacing(2)} ${theme.spacing(4)}`};
  border-radius: ${({ theme }) => theme.radii.md};
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease;

  ${({ $variant, theme }) =>
    $variant === BUTTON_VARIANTS.primary
      ? css`
          background: ${theme.colors.primary};
          border: 1px solid transparent;
          color: ${theme.colors.onPrimary};
          &:hover {
            background: ${theme.colors.primaryHover};
          }
        `
      : css`
          background: transparent;
          border: 1px solid ${theme.colors.border};
          color: ${theme.colors.text};
          &:hover {
            background: ${theme.colors.surface};
          }
        `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
