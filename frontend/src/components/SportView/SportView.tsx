import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { getApiErrorMessage } from '@/utils';
import { Explainer, Layout, Toolbar } from './SportView.styles';
import type { SportViewProps } from './SportView.types';

/**
 * The shape every dataset under /sports/:sport takes: a line on what the view
 * shows, its filters, then the data. A failed fetch replaces the content
 * rather than sitting beside it — a stale table under an error reads as live.
 */
export const SportView = ({
  explainer,
  toolbar,
  error,
  children,
}: SportViewProps) => (
  <Layout>
    <Explainer>{explainer}</Explainer>
    <Toolbar>{toolbar}</Toolbar>
    {error ? (
      <StatusMessage variant={STATUS_VARIANTS.error}>
        {getApiErrorMessage(error)}
      </StatusMessage>
    ) : (
      children
    )}
  </Layout>
);
