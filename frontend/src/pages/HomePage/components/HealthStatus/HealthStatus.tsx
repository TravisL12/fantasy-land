import { useGetHealthQuery } from '@/api/health';
import { HEALTH_LABELS } from './HealthStatus.constants';
import { Dot, Row } from './HealthStatus.styles';

export const HealthStatus = () => {
  const { data, isLoading, isError } = useGetHealthQuery();

  if (isLoading) return <Row>{HEALTH_LABELS.loading}</Row>;

  const healthy = !isError && data?.status === 'ok';

  return (
    <Row>
      <Dot $healthy={healthy} />
      {healthy ? HEALTH_LABELS.ok : HEALTH_LABELS.error}
    </Row>
  );
};
