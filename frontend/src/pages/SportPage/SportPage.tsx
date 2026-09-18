import { Outlet, useParams } from 'react-router';
import { useSportCatalog } from '@/api/sports';
import { PageHeader } from '@/components/PageHeader';
import { SportTabs } from '@/components/SportTabs';
import { StatusMessage } from '@/components/StatusMessage';
import { SPORT_PAGE_COPY } from './SportPage.constants';
import { Layout } from './SportPage.styles';
import type { SportOutletContext } from './SportPage.types';

/**
 * The shell every sport view sits in: one catalog fetch, the header, and the
 * tabs for the datasets this sport's provider actually supports.
 */
export const SportPage = () => {
  const { sport } = useParams();
  const { catalog, isLoading, isError } = useSportCatalog(sport);

  if (isLoading)
    return <StatusMessage>{SPORT_PAGE_COPY.loading}</StatusMessage>;
  if (isError || !catalog) {
    return (
      <PageHeader
        title={SPORT_PAGE_COPY.notFound}
        back={SPORT_PAGE_COPY.back}
      />
    );
  }

  return (
    <Layout>
      <PageHeader
        title={SPORT_PAGE_COPY.title(catalog.league)}
        subtitle={SPORT_PAGE_COPY.subtitle(
          catalog.dataSource.name,
          catalog.seasons.length,
        )}
        back={SPORT_PAGE_COPY.back}
      />
      <SportTabs catalog={catalog} />
      {/* Keyed so switching sports resets each view's local state. */}
      <Outlet
        key={catalog.key}
        context={{ catalog } satisfies SportOutletContext}
      />
    </Layout>
  );
};
