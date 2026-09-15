import { useGetSportsQuery } from '@/api/sports';
import { PageHeader } from '@/components/PageHeader';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { getApiErrorMessage } from '@/utils';
import { SportCard } from './components/SportCard';
import { SPORTS_COPY } from './SportsPage.constants';
import { Grid } from './SportsPage.styles';

export const SportsPage = () => {
  const { data: sports, isLoading, error } = useGetSportsQuery();

  return (
    <>
      <PageHeader
        title={SPORTS_COPY.heading}
        subtitle={SPORTS_COPY.subheading}
      />
      {isLoading && <StatusMessage>{SPORTS_COPY.loading}</StatusMessage>}
      {error && (
        <StatusMessage variant={STATUS_VARIANTS.error}>
          {getApiErrorMessage(error)}
        </StatusMessage>
      )}
      {sports?.length === 0 && (
        <StatusMessage>{SPORTS_COPY.empty}</StatusMessage>
      )}
      <Grid>
        {sports?.map((sport) => (
          <SportCard key={sport.key} sport={sport} />
        ))}
      </Grid>
    </>
  );
};
