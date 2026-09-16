import styled from 'styled-components';
import { CARD_MIN_WIDTH } from './DashboardsPage.constants';

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${CARD_MIN_WIDTH}, 1fr));
  gap: ${({ theme }) => theme.spacing(4)};
`;

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: ${({ theme }) => theme.spacing(4)};
`;
