import styled from 'styled-components';
import { CHART_PLACEHOLDER_HEIGHT } from '../../DashboardView.constants';

/** Holds the chart's height while it loads, so nothing below it jumps. */
export const Placeholder = styled.div`
  min-height: ${CHART_PLACEHOLDER_HEIGHT};
`;
