import styled from 'styled-components';
import { STATUS_VARIANTS } from './StatusMessage.constants';
import type { StatusVariant } from './StatusMessage.types';

export const Message = styled.p<{ $variant: StatusVariant }>`
  margin: ${({ theme }) => theme.spacing(6)} 0;
  text-align: center;
  color: ${({ $variant, theme }) =>
    $variant === STATUS_VARIANTS.error
      ? theme.colors.danger
      : theme.colors.textMuted};
`;
