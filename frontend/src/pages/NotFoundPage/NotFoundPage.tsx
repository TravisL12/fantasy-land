import { ROUTES } from '@/router/routes.constants';
import { NOT_FOUND_COPY } from './NotFoundPage.constants';
import { Heading, HomeLink } from './NotFoundPage.styles';

export const NotFoundPage = () => (
  <>
    <Heading>{NOT_FOUND_COPY.heading}</Heading>
    <HomeLink to={ROUTES.home}>{NOT_FOUND_COPY.backLink}</HomeLink>
  </>
);
