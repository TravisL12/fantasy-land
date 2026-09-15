import styled from 'styled-components';
import { CONTENT_MAX_WIDTH } from './Layout.constants';

export const Page = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

export const Main = styled.main`
  flex: 1;
  width: 100%;
  max-width: ${CONTENT_MAX_WIDTH};
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing(6)};
`;
