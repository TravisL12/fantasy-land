import { ROUTES } from '@/router/routes.constants';

export const USER_MENU_COPY = {
  logout: 'Log out',
} as const;

// Sign-up is intentionally absent: /register still works, it is just not advertised.
export const GUEST_LINKS = [{ label: 'Log in', to: ROUTES.login }] as const;
