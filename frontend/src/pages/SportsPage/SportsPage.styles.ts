import styled from 'styled-components';
import { SPORT_CARD_MIN_WIDTH } from './components/SportCard';

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(${SPORT_CARD_MIN_WIDTH}, 1fr)
  );
  gap: ${({ theme }) => theme.spacing(4)};
`;
