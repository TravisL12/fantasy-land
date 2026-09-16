import styled from 'styled-components';

/**
 * Scoped element styles for rendered markdown. Everything is selected through
 * this one wrapper so the app's global styles stay untouched.
 */
export const Prose = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  line-height: 1.55;

  > *:first-child {
    margin-top: 0;
  }
  > *:last-child {
    margin-bottom: 0;
  }

  p {
    margin: 0;
  }

  h1,
  h2,
  h3,
  h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }

  ul,
  ol {
    margin: 0;
    padding-left: ${({ theme }) => theme.spacing(5)};
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing(1)};
  }

  li > ul,
  li > ol {
    margin-top: ${({ theme }) => theme.spacing(1)};
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
  }

  strong {
    font-weight: 700;
  }

  code {
    padding: 1px 4px;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: ${({ theme }) => theme.colors.background};
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.85em;
  }

  pre {
    margin: 0;
    padding: ${({ theme }) => theme.spacing(3)};
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.background};
    overflow-x: auto;

    code {
      padding: 0;
      background: none;
    }
  }

  blockquote {
    margin: 0;
    padding-left: ${({ theme }) => theme.spacing(3)};
    border-left: 2px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.textMuted};
  }

  hr {
    width: 100%;
    height: 1px;
    margin: 0;
    border: 0;
    background: ${({ theme }) => theme.colors.border};
  }
`;

/** Tables scroll rather than widen the bubble past the conversation column. */
export const TableScroll = styled.div`
  max-width: 100%;
  overflow-x: auto;
`;

export const Table = styled.table`
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9em;

  th,
  td {
    padding: ${({ theme }) => `${theme.spacing(1)} ${theme.spacing(2)}`};
    border: 1px solid ${({ theme }) => theme.colors.border};
    text-align: left;
    white-space: nowrap;
  }

  th {
    background: ${({ theme }) => theme.colors.background};
    font-weight: 700;
  }
`;
