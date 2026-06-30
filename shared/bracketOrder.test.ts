import { describe, expect, it } from 'vitest';
import {
  BRACKET_FEEDERS,
  buildBracketSlots,
  getBracketFixtureNumber,
  sortMatchesForBracket,
} from './bracketOrder';

/** football-data.org uses internal ids; FIFA fixture numbers live in matchday. */
function apiMatch(fixture: number, apiId = fixture + 500_000) {
  return { id: apiId, matchday: fixture };
}

describe('getBracketFixtureNumber', () => {
  it('reads the FIFA fixture number from matchday', () => {
    expect(getBracketFixtureNumber({ id: 537_891, matchday: 91 })).toBe(91);
  });

  it('returns null when matchday is missing', () => {
    expect(getBracketFixtureNumber({ id: 91 })).toBeNull();
  });
});

describe('sortMatchesForBracket', () => {
  it('orders Round of 32 so Brazil/Japan and Ivory Coast/Norway feed match 91', () => {
    const fixtures = sortMatchesForBracket(
      'LAST_32',
      [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88].map((fixture) =>
        apiMatch(fixture),
      ),
    ).map((m) => getBracketFixtureNumber(m));

    expect(fixtures[4]).toBe(76);
    expect(fixtures[5]).toBe(78);
    expect(BRACKET_FEEDERS[91]).toEqual([76, 78]);
  });

  it('orders Round of 32 so Portugal/Croatia and Spain/Austria feed match 93', () => {
    const fixtures = sortMatchesForBracket(
      'LAST_32',
      [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88].map((fixture) =>
        apiMatch(fixture),
      ),
    ).map((m) => getBracketFixtureNumber(m));

    expect(fixtures[8]).toBe(83);
    expect(fixtures[9]).toBe(84);
    expect(BRACKET_FEEDERS[93]).toEqual([83, 84]);
  });

  it('aligns Round of 16 pairs with quarter-final parents', () => {
    const r16Fixtures = sortMatchesForBracket(
      'LAST_16',
      [89, 90, 91, 92, 93, 94, 95, 96].map((fixture) => apiMatch(fixture)),
    ).map((m) => getBracketFixtureNumber(m)!);

    const qfFixtures = sortMatchesForBracket(
      'QUARTER_FINALS',
      [97, 98, 99, 100].map((fixture) => apiMatch(fixture)),
    ).map((m) => getBracketFixtureNumber(m)!);

    for (let slot = 0; slot < 4; slot += 1) {
      const parentFixture = qfFixtures[slot];
      const feeders = BRACKET_FEEDERS[parentFixture];
      expect(feeders).toBeDefined();
      expect(r16Fixtures[slot * 2]).toBe(feeders![0]);
      expect(r16Fixtures[slot * 2 + 1]).toBe(feeders![1]);
    }
  });

  it('falls back to id sort for unknown stages', () => {
    const ordered = sortMatchesForBracket('THIRD_PLACE', [
      { id: 103, matchday: 103 },
      { id: 50, matchday: 50 },
    ]);
    expect(ordered.map((m) => m.id)).toEqual([50, 103]);
  });
});

describe('buildBracketSlots', () => {
  it('reserves empty slots when later-round fixtures are not published yet', () => {
    const slots = buildBracketSlots('LAST_16', [
      apiMatch(89),
      apiMatch(90),
      apiMatch(91),
    ]);

    expect(slots.map((slot) => (slot ? getBracketFixtureNumber(slot) : null))).toEqual([
      89,
      90,
      null,
      null,
      91,
      null,
      null,
      null,
    ]);
  });

  it('does not duplicate matches when internal ids differ from fixture numbers', () => {
    const slots = buildBracketSlots('LAST_16', [
      apiMatch(89, 600_001),
      apiMatch(90, 600_002),
      apiMatch(91, 600_003),
    ]);

    expect(slots).toHaveLength(8);
    expect(slots.filter((slot) => slot !== null)).toHaveLength(3);
    expect(getBracketFixtureNumber(slots[4]!)).toBe(91);
  });

  it('fills every slot when the full round is available', () => {
    const slots = buildBracketSlots(
      'LAST_16',
      [89, 90, 91, 92, 93, 94, 95, 96].map((fixture) => apiMatch(fixture)),
    );

    expect(slots.every((slot) => slot !== null)).toBe(true);
    expect(slots.map((slot) => getBracketFixtureNumber(slot!))).toEqual([
      89, 90, 93, 94, 91, 92, 95, 96,
    ]);
  });

  it('returns an empty array when the round has no matches', () => {
    expect(buildBracketSlots('LAST_16', [])).toEqual([]);
  });
});
