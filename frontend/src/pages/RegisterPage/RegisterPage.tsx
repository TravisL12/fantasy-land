import { Link } from 'react-router';
import { useRegisterMutation } from '@/api/auth';
import { AuthForm } from '@/components/AuthForm';
import { ROUTES } from '@/router/routes.constants';
import { getApiErrorMessage } from '@/utils';
import { REGISTER_COPY, REGISTER_FIELDS } from './RegisterPage.constants';

// RequireGuest redirects away once the session lands in the cache.
export const RegisterPage = () => {
  const [register, { isLoading, error }] = useRegisterMutation();

  return (
    <AuthForm
      title={REGISTER_COPY.title}
      fields={REGISTER_FIELDS}
      submitLabel={REGISTER_COPY.submit}
      submittingLabel={REGISTER_COPY.submitting}
      isSubmitting={isLoading}
      error={getApiErrorMessage(error)}
      onSubmit={register}
      footer={
        <>
          {REGISTER_COPY.footerPrompt}{' '}
          <Link to={ROUTES.login}>{REGISTER_COPY.footerLink}</Link>
        </>
      }
    />
  );
};
