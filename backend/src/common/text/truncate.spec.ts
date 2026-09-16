import { describe, expect, it } from 'vitest';
import {
  MAX_TOOL_RESULT_CHARS,
  TRUNCATION_ITEMS_KEY,
  TRUNCATION_KEY,
  TRUNCATION_NOTICE,
  serializeToolResult,
  serializeToolText,
  truncate,
} from './truncate.js';

const player = (index: number) => ({
  id: `p${index}`,
  name: `Player ${index}`,
  points: index * 1.5,
  team: 'ABC',
});

describe('serializeToolResult', () => {
  it('leaves a payload that fits untouched', () => {
    const value = { players: [player(1), player(2)] };
    expect(serializeToolResult(value)).toBe(JSON.stringify(value));
  });

  it('shortens lists instead of cutting the string, and stays valid JSON', () => {
    const value = { season: '2026', players: Array.from({ length: 500 }, (_, i) => player(i)) };

    const text = serializeToolResult(value);
    const parsed = JSON.parse(text) as typeof value & Record<string, string>;

    expect(text.length).toBeLessThanOrEqual(MAX_TOOL_RESULT_CHARS);
    expect(parsed.season).toBe('2026');
    expect(parsed.players.length).toBeGreaterThan(0);
    expect(parsed.players.length).toBeLessThan(500);
    expect(parsed.players[0]).toEqual(player(0));
  });

  it('says which list was shortened and by how much', () => {
    const value = { players: Array.from({ length: 500 }, (_, i) => player(i)) };

    const parsed = JSON.parse(serializeToolResult(value)) as Record<string, string>;

    expect(parsed[TRUNCATION_KEY]).toContain('players: showing');
    expect(parsed[TRUNCATION_KEY]).toContain('of 500');
  });

  it('wraps a root-level array so the note has somewhere to live', () => {
    const value = Array.from({ length: 500 }, (_, i) => player(i));

    const parsed = JSON.parse(serializeToolResult(value)) as Record<string, unknown>;

    expect(Array.isArray(parsed[TRUNCATION_ITEMS_KEY])).toBe(true);
    expect(parsed[TRUNCATION_KEY]).toContain('result: showing');
  });

  it('keeps as many rows as fit — one more would not', () => {
    const players = Array.from({ length: 500 }, (_, i) => player(i));

    const text = serializeToolResult({ players });
    const parsed = JSON.parse(text) as { players: unknown[]; [key: string]: unknown };
    // The note is part of the budget, so measure the next row against it too.
    const oneMore = JSON.stringify({
      players: players.slice(0, parsed.players.length + 1),
      [TRUNCATION_KEY]: parsed[TRUNCATION_KEY],
    });

    expect(text.length).toBeLessThanOrEqual(MAX_TOOL_RESULT_CHARS);
    expect(oneMore.length).toBeGreaterThan(MAX_TOOL_RESULT_CHARS);
  });

  it('caps lists nested inside list items too', () => {
    const value = {
      teams: Array.from({ length: 30 }, (_, i) => ({
        team: `T${i}`,
        games: Array.from({ length: 162 }, (_, g) => ({ game: g, runs: g % 7 })),
      })),
    };

    const parsed = JSON.parse(serializeToolResult(value)) as {
      teams: { games: unknown[] }[];
      [key: string]: unknown;
    };

    expect(parsed.teams[0].games.length).toBeLessThan(162);
    expect(parsed[TRUNCATION_KEY]).toContain('teams.games: showing');
  });

  it('falls back to character truncation when there is no list to trim', () => {
    const value = { note: 'x'.repeat(MAX_TOOL_RESULT_CHARS * 2) };

    const text = serializeToolResult(value);

    expect(text.endsWith(TRUNCATION_NOTICE)).toBe(true);
  });
});

describe('serializeToolText', () => {
  it('trims JSON text structurally', () => {
    const text = JSON.stringify({ rosters: Array.from({ length: 500 }, (_, i) => player(i)) });

    const parsed = JSON.parse(serializeToolText(text)) as Record<string, string>;

    expect(parsed[TRUNCATION_KEY]).toContain('rosters: showing');
  });

  it('falls back to characters for prose', () => {
    const text = 'a'.repeat(MAX_TOOL_RESULT_CHARS * 2);

    expect(serializeToolText(text)).toBe(truncate(text));
  });
});
