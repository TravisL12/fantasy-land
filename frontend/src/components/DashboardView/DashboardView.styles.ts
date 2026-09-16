import styled from 'styled-components';

export const Shell = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(6)};
`;

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
`;

export const Updated = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.85rem;
`;

export const Widget = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
`;

export const WidgetTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
`;

export const Description = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
`;
