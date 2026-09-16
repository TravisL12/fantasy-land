import { useCurrentUser } from '@/hooks';
import { UserMenu } from './components/UserMenu';
import { APP_TITLE, NAV_LINKS } from './NavBar.constants';
import { Bar, Link, Links, Title } from './NavBar.styles';

export const NavBar = () => {
  // Every nav destination sits behind RequireAuth, so guests get no links to follow.
  const { user } = useCurrentUser();

  return (
    <Bar>
      <Title>{APP_TITLE}</Title>
      <Links>
        {user &&
          NAV_LINKS.map(({ label, to, end }) => (
            <Link key={to} to={to} end={end}>
              {label}
            </Link>
          ))}
      </Links>
      <UserMenu />
    </Bar>
  );
};
