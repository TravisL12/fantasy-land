import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders a GFM table as a real table', () => {
    renderWithProviders(
      <Markdown>
        {[
          '| Player | PPR |',
          '| --- | --- |',
          '| Puka Nacua | 375 |',
          '| Amon-Ra St. Brown | 324 |',
        ].join('\n')}
      </Markdown>,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Player' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Puka Nacua' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('renders lists, bold and inline code', () => {
    renderWithProviders(
      <Markdown>
        {'- **Bijan Robinson** is `more consistent`\n- Gibbs has a higher ceiling'}
      </Markdown>,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Bijan Robinson').tagName).toBe('STRONG');
    expect(screen.getByText('more consistent').tagName).toBe('CODE');
  });

  it('renders headings and fenced code blocks', () => {
    renderWithProviders(
      <Markdown>{'## Week 2\n\n```\nrec_yd 293\n```'}</Markdown>,
    );

    expect(
      screen.getByRole('heading', { name: 'Week 2' }),
    ).toBeInTheDocument();
    expect(screen.getByText('rec_yd 293').tagName).toBe('CODE');
  });

  it('shows model-emitted HTML as text instead of injecting it', () => {
    const { container } = renderWithProviders(
      <Markdown>{'<img src=x onerror="alert(1)"> and <b>bold</b>'}</Markdown>,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('opens links safely in a new tab', () => {
    renderWithProviders(<Markdown>{'[Sleeper](https://sleeper.com)'}</Markdown>);

    const link = screen.getByRole('link', { name: 'Sleeper' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('renders partial markdown mid-stream without throwing', () => {
    renderWithProviders(<Markdown>{'| Player | PPR |\n| --- |'}</Markdown>);

    expect(screen.getByText(/Player/)).toBeInTheDocument();
  });
});
