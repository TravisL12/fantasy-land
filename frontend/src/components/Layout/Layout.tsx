import { Outlet } from 'react-router';
import { NavBar } from './components/NavBar';
import { Main, Page } from './Layout.styles';

export const Layout = () => (
  <Page>
    <NavBar />
    <Main>
      <Outlet />
    </Main>
  </Page>
);
