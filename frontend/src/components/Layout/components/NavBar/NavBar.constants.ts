import { ROUTES } from '@/router/routes.constants';
import type { NavLinkItem } from './NavBar.types';

export const APP_TITLE = 'Fantasy Land';

export const NAV_LINKS: NavLinkItem[] = [
  { label: 'Home', to: ROUTES.home, end: true },
  { label: 'Sports', to: ROUTES.sports },
  { label: 'Chat', to: ROUTES.chat },
];
