import styled from 'styled-components';
import { CONTENT_MAX_WIDTH } from './Layout.constants';

export const Page = styled.div`
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const Main = styled.main`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: ${CONTENT_MAX_WIDTH};
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing(6)};
  overflow-y: auto;
`;
