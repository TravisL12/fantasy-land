import styled from 'styled-components';
import { AUTH_FORM_MAX_WIDTH } from './AuthForm.constants';

export const Card = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  width: 100%;
  max-width: ${AUTH_FORM_MAX_WIDTH};
  margin: ${({ theme }) => theme.spacing(10)} auto 0;
  padding: ${({ theme }) => theme.spacing(8)};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`;

export const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
`;

export const ErrorBanner = styled.div`
  padding: ${({ theme }) => `${theme.spacing(2.5)} ${theme.spacing(3)}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.danger};
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.9rem;
`;

export const Footer = styled.p`
  margin: 0;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};

  a {
    color: ${({ theme }) => theme.colors.primary};
  }
`;
