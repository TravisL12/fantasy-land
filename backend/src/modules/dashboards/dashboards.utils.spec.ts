import { BadRequestException } from '@nestjs/common';
import { WIDGET_TYPES } from './dashboards.constants.js';
import { parseSpec } from './dashboards.utils.js';

const TOOLS = ['get_leaderboard', 'get_player_game_log'];

const table = {
  type: WIDGET_TYPES.table,
  id: 'leaders',
  title: 'Leaders',
  source: 'top',
  columns: [{ key: 'name', header: 'Player', path: 'name', format: 'text' }],
};

const spec = {
  title: 'Top receivers',
  sources: [{ id: 'top', tool: 'get_leaderboard', args: { sport: 'nfl' } }],
  widgets: [table],
};

describe('parseSpec', () => {
  it('normalizes a valid spec', () => {
    const parsed = parseSpec(spec, TOOLS);

    expect(parsed.title).toBe('Top receivers');
    expect(parsed.sources[0]).toEqual({
      id: 'top',
      tool: 'get_leaderboard',
      args: { sport: 'nfl' },
    });
    expect(parsed.widgets[0]).toMatchObject({ id: 'leaders', selectable: true });
  });

  it('accepts a spec sent as JSON strings, as small models emit it', () => {
    const parsed = parseSpec(
      {
        ...spec,
        sources: JSON.stringify(spec.sources),
        widgets: [{ ...table, columns: JSON.stringify(table.columns) }],
      },
      TOOLS,
    );

    expect(parsed.sources).toHaveLength(1);
    expect(parsed.widgets[0]).toMatchObject({ id: 'leaders' });
  });

  it('defaults a column path to its key', () => {
    const parsed = parseSpec(
      { ...spec, widgets: [{ ...table, columns: [{ key: 'team', header: 'Team' }] }] },
      TOOLS,
    );

    expect(parsed.widgets[0]).toMatchObject({
      columns: [expect.objectContaining({ path: 'team' })],
    });
  });

  it('rejects a source naming a tool that does not exist', () => {
    expect(() =>
      parseSpec(
        { ...spec, sources: [{ id: 'top', tool: 'make_it_up', args: {} }] },
        TOOLS,
      ),
    ).toThrow(/Unknown data tool "make_it_up"/);
  });

  it('rejects a widget pointing at an undefined source', () => {
    expect(() =>
      parseSpec({ ...spec, widgets: [{ ...table, source: 'nope' }] }, TOOLS),
    ).toThrow(/not defined/);
  });

  it('rejects a compare widget with no table to read from', () => {
    expect(() =>
      parseSpec(
        {
          ...spec,
          widgets: [
            table,
            { type: WIDGET_TYPES.compare, id: 'vs', title: 'Compare', from: 'other' },
          ],
        },
        TOOLS,
      ),
    ).toThrow(/not a table in this dashboard/);
  });

  it('rejects a sort key that is not a column', () => {
    expect(() =>
      parseSpec(
        { ...spec, widgets: [{ ...table, sort: { key: 'points', order: 'desc' } }] },
        TOOLS,
      ),
    ).toThrow(/not one of its columns/);
  });

  it('rejects duplicate widget ids', () => {
    expect(() =>
      parseSpec({ ...spec, widgets: [table, { ...table }] }, TOOLS),
    ).toThrow(BadRequestException);
  });
});
