import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LoginPage } from './LoginPage';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('LoginPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts credentials and shows the server error', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(401, {
        statusCode: 401,
        error: { message: 'Invalid email or password', statusCode: 401 },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'coach@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password',
    );
    const [request] = fetchMock.mock.calls[0] as unknown as [Request];
    expect(request.url).toMatch(/\/api\/auth\/login$/);
    await expect(request.json()).resolves.toEqual({
      email: 'coach@example.com',
      password: 'wrong-password',
    });
  });
});
