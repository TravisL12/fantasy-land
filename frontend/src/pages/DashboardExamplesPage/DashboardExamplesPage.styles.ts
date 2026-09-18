import styled from 'styled-components';
import { CARD_MIN_WIDTH } from './DashboardExamplesPage.constants';

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  margin-bottom: ${({ theme }) => theme.spacing(10)};
`;

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.1rem;
`;

export const Lead = styled.p`
  margin: 0;
  max-width: 70ch;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${CARD_MIN_WIDTH}, 1fr));
  gap: ${({ theme }) => theme.spacing(4)};
`;

export const Card = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(4)};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
`;

export const CardHeading = styled.h3`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  margin: 0;
  font-size: 1rem;
`;

/** The spec keyword, so the card names the thing the saved dashboard calls it. */
export const Kind = styled.code`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.8rem;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const CardText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const Detail = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-weight: 600;
  }
`;

/** Verbatim words to type into the builder, so they read as a quote, not prose. */
export const Ask = styled.blockquote`
  margin: 0;
  padding-left: ${({ theme }) => theme.spacing(3)};
  border-left: 2px solid ${({ theme }) => theme.colors.primary};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const Formats = styled.dl`
  display: grid;
  grid-template-columns: max-content max-content 1fr;
  align-items: baseline;
  gap: ${({ theme }) => `${theme.spacing(2)} ${theme.spacing(4)}`};
  margin: 0;
  font-size: 0.9rem;
`;

export const FormatName = styled.dt`
  font-family: ${({ theme }) => theme.fonts.mono};
  color: ${({ theme }) => theme.colors.text};
`;

export const FormatExample = styled.dd`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.mono};
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const FormatSummary = styled.dd`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const Spec = styled.details`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing(4)};

  summary {
    cursor: pointer;
    font-weight: 600;
  }
`;

export const SpecCode = styled.pre`
  overflow-x: auto;
  margin: ${({ theme }) => `${theme.spacing(3)} 0 0`};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;
