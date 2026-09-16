import { useLoginMutation } from '@/api/auth';
import { AuthForm } from '@/components/AuthForm';
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
    />
  );
};
