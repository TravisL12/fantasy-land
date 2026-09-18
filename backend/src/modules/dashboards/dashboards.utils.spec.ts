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

describe('parseSpec source references', () => {
  const widget = (over: Record<string, unknown>) => ({
    ...spec,
    widgets: [{ ...table, ...over }],
  });

  it('fills in an omitted source when the spec defines exactly one', () => {
    const { source, ...noSource } = table;
    void source;
    const parsed = parseSpec({ ...spec, widgets: [noSource] }, TOOLS);

    expect(parsed.widgets[0]).toMatchObject({ source: 'top' });
  });

  it('accepts the source id spelled sourceId', () => {
    const { source, ...noSource } = table;
    void source;
    const parsed = parseSpec(widget({ ...noSource, sourceId: 'top' }), TOOLS);

    expect(parsed.widgets[0]).toMatchObject({ source: 'top' });
  });

  it('accepts the whole source object in place of its id', () => {
    const parsed = parseSpec(widget({ source: { id: 'top' } }), TOOLS);

    expect(parsed.widgets[0]).toMatchObject({ source: 'top' });
  });

  it('still rejects an omitted source when there is more than one', () => {
    const { source, ...noSource } = table;
    void source;

    expect(() =>
      parseSpec(
        {
          ...spec,
          sources: [
            ...spec.sources,
            { id: 'other', tool: 'get_leaderboard', args: {} },
          ],
          widgets: [noSource],
        },
        TOOLS,
      ),
    ).toThrow(BadRequestException);
  });
});

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

  it('parses a chart, defaulting each series to the widget source', () => {
    const parsed = parseSpec(
      {
        ...spec,
        sources: [
          ...spec.sources,
          { id: 'log', tool: 'get_player_game_log', args: { playerId: '1' } },
        ],
        widgets: [
          {
            type: WIDGET_TYPES.line,
            id: 'trend',
            title: 'Weekly points',
            source: 'log',
            rowsPath: 'games',
            width: 'full',
            x: { path: 'week', label: 'Week' },
            series: [
              { key: 'pts', label: 'Points', path: 'fantasyPoints' },
              { key: 'other', label: 'Other', path: 'fantasyPoints', source: 'top' },
            ],
          },
        ],
      },
      TOOLS,
    );

    expect(parsed.widgets[0]).toMatchObject({
      type: 'line',
      x: { path: 'week', label: 'Week' },
      series: [
        { key: 'pts', source: undefined },
        { key: 'other', source: 'top' },
      ],
    });
  });

  it('rejects a chart series reading a source that does not exist', () => {
    expect(() =>
      parseSpec(
        {
          ...spec,
          widgets: [
            {
              type: WIDGET_TYPES.bar,
              id: 'bars',
              title: 'Points',
              source: 'top',
              x: { path: 'name' },
              series: [{ key: 'pts', label: 'Points', path: 'fantasyPoints', source: 'ghost' }],
            },
          ],
        },
        TOOLS,
      ),
    ).toThrow(/not defined/);
  });

  it('rejects a chart with more series than the palette can keep apart', () => {
    const series = ['a', 'b', 'c', 'd', 'e'].map((key) => ({
      key,
      label: key,
      path: 'fantasyPoints',
    }));

    expect(() =>
      parseSpec(
        {
          ...spec,
          widgets: [
            {
              type: WIDGET_TYPES.line,
              id: 'trend',
              title: 'Trend',
              source: 'top',
              x: { path: 'week' },
              series,
            },
          ],
        },
        TOOLS,
      ),
    ).toThrow(/Split it into two charts/);
  });

  it('parses a versus widget and keeps a metric\'s winning direction', () => {
    const parsed = parseSpec(
      {
        ...spec,
        widgets: [
          {
            type: WIDGET_TYPES.versus,
            id: 'vs',
            title: 'Head to head',
            source: 'top',
            rowsPath: 'players',
            metrics: [
              { key: 'ppg', header: 'PPG', path: 'pointsPerGame', format: 'decimal' },
              { key: 'vol', header: 'Volatility', path: 'volatility', better: 'lower' },
            ],
          },
        ],
      },
      TOOLS,
    );

    expect(parsed.widgets[0]).toMatchObject({
      type: 'versus',
      rowsPath: 'players',
      metrics: [{ key: 'ppg', better: undefined }, { key: 'vol', better: 'lower' }],
    });
  });

  it('rejects a versus widget with no metrics', () => {
    expect(() =>
      parseSpec(
        {
          ...spec,
          widgets: [
            { type: WIDGET_TYPES.versus, id: 'vs', title: 'Head to head', source: 'top' },
          ],
        },
        TOOLS,
      ),
    ).toThrow(/needs "metrics"/);
  });

  it('parses stats, meter and badges widgets', () => {
    const parsed = parseSpec(
      {
        ...spec,
        widgets: [
          {
            type: WIDGET_TYPES.stats,
            id: 'headline',
            title: 'Season',
            source: 'top',
            path: 'consistency',
            width: 'half',
            tiles: [{ key: 'avg', header: 'PPG', path: 'average', format: 'decimal' }],
          },
          {
            type: WIDGET_TYPES.meter,
            id: 'matchups',
            title: 'Matchups',
            source: 'top',
            valuePath: 'score',
            gradePath: 'grade',
          },
          {
            type: WIDGET_TYPES.badges,
            id: 'status',
            title: 'Availability',
            source: 'top',
            statusPath: 'availability',
            notePath: 'note',
          },
        ],
      },
      TOOLS,
    );

    expect(parsed.widgets.map(({ type }) => type)).toEqual(['stats', 'meter', 'badges']);
    expect(parsed.widgets[0]).toMatchObject({ width: 'half', path: 'consistency' });
    expect(parsed.widgets[1]).toMatchObject({ valuePath: 'score', gradePath: 'grade' });
  });

  it('rejects a meter with no value to render', () => {
    expect(() =>
      parseSpec(
        {
          ...spec,
          widgets: [
            { type: WIDGET_TYPES.meter, id: 'm', title: 'Matchups', source: 'top' },
          ],
        },
        TOOLS,
      ),
    ).toThrow(/"valuePath" on meter "m" is required/);
  });

  it('rejects an unknown widget width', () => {
    expect(() =>
      parseSpec({ ...spec, widgets: [{ ...table, width: 'wide' }] }, TOOLS),
    ).toThrow(/"width" must be one of/);
  });

  it('rejects duplicate widget ids', () => {
    expect(() =>
      parseSpec({ ...spec, widgets: [table, { ...table }] }, TOOLS),
    ).toThrow(BadRequestException);
  });
});
