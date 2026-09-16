import styled from 'styled-components';

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  margin-bottom: ${({ theme }) => theme.spacing(2)};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.85rem;
`;

export const Checkbox = styled.input`
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.primary};
`;
