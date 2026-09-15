import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from 'styled-components';
import { makeStore, type RootState } from '@/store';
import { theme } from '@/styles';

interface RenderWithProvidersOptions extends RenderOptions {
  route?: string;
  preloadedState?: Partial<RootState>;
}

export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', preloadedState, ...options }: RenderWithProvidersOptions = {},
) => {
  const store = makeStore(preloadedState);

  return {
    store,
    ...render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </ThemeProvider>
      </Provider>,
      options,
    ),
  };
};
