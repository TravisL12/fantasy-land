import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DashboardExamplesPage } from './DashboardExamplesPage';
import { EXAMPLE_SPEC, WIDGET_GUIDE } from './DashboardExamplesPage.constants';

describe('DashboardExamplesPage', () => {
  it('documents every widget kind the spec can use', () => {
    renderWithProviders(<DashboardExamplesPage />);

    const kinds = WIDGET_GUIDE.map(({ type }) => type);
    const shown = EXAMPLE_SPEC.widgets.map(({ type }) => type);

    expect(new Set(shown)).toEqual(new Set(kinds));
    for (const { title } of WIDGET_GUIDE) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('renders the example from its sample data, without fetching', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<DashboardExamplesPage />);

    // The sample player heads the table, the versus panel and the badge list.
    expect(screen.getAllByText('M. Okafor').length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
