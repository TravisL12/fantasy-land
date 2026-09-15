import { useCurrentUser } from '@/hooks';
import { ROUTES } from '@/router/routes.constants';
import { HealthStatus } from './components/HealthStatus';
import { HOME_COPY } from './HomePage.constants';
import { Heading, SportsLink } from './HomePage.styles';

// Rendered inside RequireAuth, so a user is always present.
export const HomePage = () => {
  const { user } = useCurrentUser();

  return (
    <>
      <Heading>{user && HOME_COPY.greeting(user.username)}</Heading>
      <SportsLink to={ROUTES.sports}>{HOME_COPY.sportsCta}</SportsLink>
      <div>
        <HealthStatus />
      </div>
    </>
  );
};
