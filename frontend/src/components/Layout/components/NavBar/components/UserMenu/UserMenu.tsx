import { useLogoutMutation } from '@/api/auth';
import { BUTTON_VARIANTS, Button } from '@/components/Button';
import { useCurrentUser } from '@/hooks';
import { Link } from '../../NavBar.styles';
import { GUEST_LINKS, USER_MENU_COPY } from './UserMenu.constants';
import { Menu, Username } from './UserMenu.styles';

export const UserMenu = () => {
  const { user, isLoading } = useCurrentUser();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  if (isLoading) return null;

  return (
    <Menu>
      {user ? (
        <>
          <Username>{user.username}</Username>
          <Button
            variant={BUTTON_VARIANTS.ghost}
            disabled={isLoggingOut}
            onClick={() => logout()}
          >
            {USER_MENU_COPY.logout}
          </Button>
        </>
      ) : (
        GUEST_LINKS.map(({ label, to }) => (
          <Link key={to} to={to}>
            {label}
          </Link>
        ))
      )}
    </Menu>
  );
};
