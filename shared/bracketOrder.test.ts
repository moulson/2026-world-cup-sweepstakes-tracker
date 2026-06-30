import { describe, expect, it } from 'vitest';
import {
  BRACKET_FEEDERS,
  buildKnockoutBracket,
  getBracketFixtureNumber,
  indexMatchesByFixture,
  KNOCKOUT_ROUNDS,
} from './bracketOrder';
import type { Match } from './types';

/** football-data.org uses internal ids; FIFA fixture numbers live in matchday. */
function apiMatch(fixture: number, apiId = fixture + 500_000): Match {
  return {
    id: apiId,
    matchday: fixture,
    utcDate: '2026-07-05T20:00:00Z',
    status: 'SCHEDULED',
    stage: fixture <= 88 ? 'LAST_32' : 'LAST_16',
    lastUpdated: '2026-06-30T00:00:00Z',
    homeTeam: { id: 1, name: 'Home', shortName: 'Home', tla: 'HOM' },
    awayTeam: { id: 2, name: 'Away', shortName: 'Away', tla: 'AWY' },
    score: { winner: null, duration: 'REGULAR', fullTime: { home: null, away: null } },
  };
}

const ALL_R32_FIXTURES = [
  73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
];

describe('getBracketFixtureNumber', () => {
  it('reads the FIFA fixture number from matchday', () => {
    expect(getBracketFixtureNumber({ id: 537_891, matchday: 91 })).toBe(91);
  });

  it('returns null when matchday is missing', () => {
    expect(getBracketFixtureNumber({ id: 91 })).toBeNull();
  });
});

describe('buildKnockoutBracket', () => {
  it('always renders the full tree with every predetermined fixture slot', () => {
    const bracket = buildKnockoutBracket([]);

    expect(bracket.rounds).toHaveLength(5);
    expect(bracket.rounds[0].slots).toHaveLength(16);
    expect(bracket.rounds[1].slots).toHaveLength(8);
    expect(bracket.rounds[2].slots).toHaveLength(4);
    expect(bracket.rounds[3].slots).toHaveLength(2);
    expect(bracket.rounds[4].slots).toHaveLength(1);
    expect(bracket.thirdPlace.fixture).toBe(103);
    expect(bracket.rounds.every((round) => round.slots.every((slot) => slot.match === null))).toBe(
      true,
    );
  });

  it('overlays API data onto the correct fixture slot by matchday', () => {
    const brazilR16 = apiMatch(91, 600_091);
    const bracket = buildKnockoutBracket([
      apiMatch(89),
      apiMatch(90),
      brazilR16,
    ]);

    const r16 = bracket.rounds.find((r) => r.stage === 'LAST_16')!;
    expect(r16.slots.map((s) => s.fixture)).toEqual([89, 90, 93, 94, 91, 92, 95, 96]);
    expect(r16.slots[4].match).toBe(brazilR16);
    expect(r16.slots[0].match?.id).toBe(500_089);
    expect(r16.slots[2].match).toBeNull();
  });

  it('never duplicates fixtures when internal ids differ from matchday', () => {
    const matches = [89, 90, 91].map((f) => apiMatch(f, 900_000 + f));
    const bracket = buildKnockoutBracket(matches);
    const r16Matches = bracket.rounds
      .find((r) => r.stage === 'LAST_16')!
      .slots.filter((s) => s.match !== null);

    expect(r16Matches).toHaveLength(3);
    expect(r16Matches.map((s) => s.fixture)).toEqual([89, 90, 91]);
  });
});

describe('predetermined feeder alignment', () => {
  const allKnockout = [
    ...ALL_R32_FIXTURES,
    89, 90, 91, 92, 93, 94, 95, 96,
    97, 98, 99, 100, 101, 102, 103, 104,
  ].map((fixture) => apiMatch(fixture));

  it('places Brazil/Japan and Ivory Coast/Norway at the pair feeding RO16 fixture 91', () => {
    const bracket = buildKnockoutBracket(allKnockout);
    const r32 = bracket.rounds.find((r) => r.stage === 'LAST_32')!.slots;
    const r16 = bracket.rounds.find((r) => r.stage === 'LAST_16')!.slots;

    const brazilSlot = r16.findIndex((s) => s.fixture === 91);
    expect(brazilSlot).toBe(4);

    const feederA = r32[brazilSlot * 2].fixture;
    const feederB = r32[brazilSlot * 2 + 1].fixture;
    expect([feederA, feederB]).toEqual(BRACKET_FEEDERS[91]);
  });

  it('aligns every round-of-32 pair with its round-of-16 parent', () => {
    const bracket = buildKnockoutBracket(allKnockout);
    const r32 = bracket.rounds.find((r) => r.stage === 'LAST_32')!.slots;
    const r16 = bracket.rounds.find((r) => r.stage === 'LAST_16')!.slots;

    for (let slot = 0; slot < r16.length; slot += 1) {
      const feeders = BRACKET_FEEDERS[r16[slot].fixture];
      expect(r32[slot * 2].fixture).toBe(feeders![0]);
      expect(r32[slot * 2 + 1].fixture).toBe(feeders![1]);
    }
  });

  it('aligns round-of-16 pairs with quarter-final parents', () => {
    const bracket = buildKnockoutBracket(allKnockout);
    const r16 = bracket.rounds.find((r) => r.stage === 'LAST_16')!.slots;
    const qf = bracket.rounds.find((r) => r.stage === 'QUARTER_FINALS')!.slots;

    for (let slot = 0; slot < qf.length; slot += 1) {
      const feeders = BRACKET_FEEDERS[qf[slot].fixture];
      expect(r16[slot * 2].fixture).toBe(feeders![0]);
      expect(r16[slot * 2 + 1].fixture).toBe(feeders![1]);
    }
  });

  it('lists every knockout fixture exactly once in the static tree', () => {
    const listed = new Set<number>([
      ...KNOCKOUT_ROUNDS.flatMap((r) => r.fixtures),
      103,
    ]);
    for (let fixture = 73; fixture <= 104; fixture += 1) {
      expect(listed.has(fixture)).toBe(true);
    }
    expect(listed.size).toBe(32);
  });
});

describe('indexMatchesByFixture', () => {
  it('keys matches by matchday not internal id', () => {
    const indexed = indexMatchesByFixture([apiMatch(91, 999_999)]);
    expect(indexed.get(91)?.id).toBe(999_999);
    expect(indexed.has(999_999)).toBe(false);
  });
});
