import type { DirectoryPlayer } from './sports.types.js';
import { matchPlayers } from './sports.utils.js';

const player = (
  name: string,
  rank: number | null = null,
  position = 'WR',
): DirectoryPlayer => ({
  id: name,
  name,
  team: 'BUF',
  position,
  group: 'offense',
  status: 'Active',
  availability: 'active',
  rank,
});

const directory = [
  player('Josh Allen', 4, 'QB'),
  player('Keenan Allen', 60),
  player('Braelon Allen', 240, 'RB'),
  player("Ja'Marr Chase", 3),
  player('Amon-Ra St. Brown', 8),
  player('Chasen Hines', null),
];

describe('matchPlayers', () => {
  it('ranks a surname search by upstream relevance, not the alphabet', () => {
    const found = matchPlayers(directory, 'allen', 5);

    expect(found.map(({ name }) => name)).toEqual([
      'Josh Allen',
      'Keenan Allen',
      'Braelon Allen',
    ]);
  });

  it('prefers a whole-name match to a fragment of another name', () => {
    const found = matchPlayers(directory, 'chase', 5);

    expect(found[0].name).toBe("Ja'Marr Chase");
    expect(found.map(({ name }) => name)).toContain('Chasen Hines');
  });

  it('ignores punctuation, accents and case in both directions', () => {
    expect(matchPlayers(directory, 'jamarr', 5)[0].name).toBe("Ja'Marr Chase");
    expect(matchPlayers(directory, "JA'MARR CHASE", 5)[0].name).toBe(
      "Ja'Marr Chase",
    );
    expect(matchPlayers(directory, 'amon ra', 5)[0].name).toBe(
      'Amon-Ra St. Brown',
    );
  });

  it('sinks players upstream never ranked below those it did', () => {
    const unranked = player('Aaron Allen', null);
    const found = matchPlayers([unranked, ...directory], 'allen', 5);

    expect(found.at(-1)!.name).toBe('Aaron Allen');
  });

  it('honours the limit and returns nothing for an empty query', () => {
    expect(matchPlayers(directory, 'allen', 2)).toHaveLength(2);
    expect(matchPlayers(directory, '   ', 5)).toEqual([]);
  });
});
