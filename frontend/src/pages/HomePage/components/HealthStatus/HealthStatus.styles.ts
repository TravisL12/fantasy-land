import styled from 'styled-components';
import type { DotProps } from './HealthStatus.types';

export const Row = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const Dot = styled.span<DotProps>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $healthy, theme }) =>
    $healthy ? theme.colors.success : theme.colors.danger};
`;
