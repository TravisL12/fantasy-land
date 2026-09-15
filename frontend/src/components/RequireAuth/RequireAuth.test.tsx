import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RequireAuth } from './RequireAuth';

const stubSession = (user: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ user }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );

const renderRoutes = () =>
  renderWithProviders(
    <Routes>
      <Route element={<RequireAuth />}>
        <Route path="/" element={<p>Dashboard</p>} />
      </Route>
      <Route path="/login" element={<p>Login screen</p>} />
    </Routes>,
  );

describe('RequireAuth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects guests to login', async () => {
    stubSession(null);
    renderRoutes();
    expect(await screen.findByText('Login screen')).toBeInTheDocument();
  });

  it('renders the page for a logged-in user', async () => {
    stubSession({ id: '1', email: 'a@b.co', username: 'coach', createdAt: '' });
    renderRoutes();
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });
});
