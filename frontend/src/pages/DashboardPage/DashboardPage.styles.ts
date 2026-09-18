import styled from 'styled-components';

/** The request the dashboard was built from, kept visible above the widgets. */
export const Prompt = styled.blockquote`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
  margin: 0 0 ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => `${theme.spacing(3)} ${theme.spacing(4)}`};
  border-left: 2px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
`;

export const PromptLabel = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const PromptText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
  /* Each refinement is its own line, so the blank lines between them matter. */
  white-space: pre-wrap;
`;
