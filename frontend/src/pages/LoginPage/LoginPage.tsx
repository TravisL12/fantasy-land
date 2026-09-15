import { Link } from 'react-router';
import { useLoginMutation } from '@/api/auth';
import { AuthForm } from '@/components/AuthForm';
import { ROUTES } from '@/router/routes.constants';
import { getApiErrorMessage } from '@/utils';
import { LOGIN_COPY, LOGIN_FIELDS } from './LoginPage.constants';

// RequireGuest redirects away once the session lands in the cache.
export const LoginPage = () => {
  const [login, { isLoading, error }] = useLoginMutation();

  return (
    <AuthForm
      title={LOGIN_COPY.title}
      fields={LOGIN_FIELDS}
      submitLabel={LOGIN_COPY.submit}
      submittingLabel={LOGIN_COPY.submitting}
      isSubmitting={isLoading}
      error={getApiErrorMessage(error)}
      onSubmit={login}
      footer={
        <>
          {LOGIN_COPY.footerPrompt}{' '}
          <Link to={ROUTES.register}>{LOGIN_COPY.footerLink}</Link>
        </>
      }
    />
  );
};
