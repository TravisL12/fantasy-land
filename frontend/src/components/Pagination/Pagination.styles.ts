import styled from 'styled-components';

export const Bar = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
`;

export const Range = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
`;

export const Buttons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
`;
