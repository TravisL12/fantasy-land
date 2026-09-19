import styled from 'styled-components';

export const Starter = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Rating = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.75rem;
`;
