import styled from 'styled-components';
import { METER_TONES } from '../../DashboardView.constants';
import type { MeterFillProps } from './MeterList.types';

export const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const Row = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`;

export const Heading = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
  font-size: 0.9rem;
`;

export const Reading = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-variant-numeric: tabular-nums;
`;

/** The track is a lighter step of the fill's own ramp, so state reads across it. */
export const Track = styled.div`
  height: 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

export const Fill = styled.div<MeterFillProps>`
  height: 100%;
  width: ${({ $percent }) => `${$percent}%`};
  border-radius: inherit;
  background: ${({ theme, $tone }) => theme.colors.status[METER_TONES[$tone]]};
`;
