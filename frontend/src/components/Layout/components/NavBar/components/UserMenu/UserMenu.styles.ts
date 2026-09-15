import styled from 'styled-components';

export const Menu = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(4)};
  margin-left: auto;
`;

export const Username = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
`;
