import { ROUTES } from '@/router/routes.constants';

export const USER_MENU_COPY = {
  logout: 'Log out',
} as const;

export const GUEST_LINKS = [
  { label: 'Log in', to: ROUTES.login },
  { label: 'Sign up', to: ROUTES.register },
] as const;
