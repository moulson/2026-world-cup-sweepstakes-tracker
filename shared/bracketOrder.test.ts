import { describe, expect, it } from 'vitest';
import {
  BRACKET_FEEDERS,
  buildKnockoutBracket,
  getBracketFixtureNumber,
  KNOCKOUT_ROUNDS,
} from './bracketOrder';
import { KNOCKOUT_FIXTURE_KICKOFFS, resolveKnockoutFixture } from './knockoutFixtures';
import type { Match } from './types';

function apiMatch(
  overrides: Partial<Match> & Pick<Match, 'stage' | 'utcDate'>,
): Match {
  return {
    id: 900_000 + Math.floor(Math.random() * 1000),
    status: 'SCHEDULED',
    lastUpdated: '2026-06-30T00:00:00Z',
    homeTeam: { id: 1, name: 'Home', shortName: 'Home', tla: 'HOM' },
    awayTeam: { id: 2, name: 'Away', shortName: 'Away', tla: 'AWY' },
    score: { winner: null, duration: 'REGULAR', fullTime: { home: null, away: null } },
    matchday: null,
    ...overrides,
  };
}

describe('resolveKnockoutFixture', () => {
  it('maps football-data matches by kickoff time when matchday is absent', () => {
    const brazilR32 = apiMatch({
      id: 537_100,
      stage: 'LAST_32',
      utcDate: KNOCKOUT_FIXTURE_KICKOFFS[76],
      homeTeam: { id: 1, name: 'Brazil', shortName: 'Brazil', tla: 'BRA' },
      awayTeam: { id: 2, name: 'Japan', shortName: 'Japan', tla: 'JPN' },
    });

    expect(resolveKnockoutFixture(brazilR32)).toBe(76);
  });

  it('maps round-of-16 ties by kickoff time', () => {
    const brazilR16 = apiMatch({
      id: 537_200,
      stage: 'LAST_16',
      utcDate: KNOCKOUT_FIXTURE_KICKOFFS[91],
    });

    expect(resolveKnockoutFixture(brazilR16)).toBe(91);
  });

  it('maps per-round matchday 1..n when API uses round-local numbering', () => {
    const firstR32 = apiMatch({
      stage: 'LAST_32',
      utcDate: '2099-01-01T00:00:00Z',
      matchday: 1,
    });

    expect(resolveKnockoutFixture(firstR32)).toBe(73);
  });

  it('ignores group-stage matches', () => {
    const group = apiMatch({
      stage: 'GROUP_STAGE',
      utcDate: KNOCKOUT_FIXTURE_KICKOFFS[76],
      matchday: 76,
    });

    expect(resolveKnockoutFixture(group)).toBeNull();
  });
});

describe('buildKnockoutBracket', () => {
  it('overlays API matches without matchday onto the static tree', () => {
    const matches = [
      apiMatch({ stage: 'LAST_32', utcDate: KNOCKOUT_FIXTURE_KICKOFFS[74] }),
      apiMatch({ stage: 'LAST_32', utcDate: KNOCKOUT_FIXTURE_KICKOFFS[76] }),
      apiMatch({ stage: 'LAST_16', utcDate: KNOCKOUT_FIXTURE_KICKOFFS[91] }),
    ];

    const bracket = buildKnockoutBracket(matches);
    const r32 = bracket.rounds.find((r) => r.stage === 'LAST_32')!;
    const r16 = bracket.rounds.find((r) => r.stage === 'LAST_16')!;

    expect(r32.slots.some((s) => s.fixture === 74 && s.match !== null)).toBe(true);
    expect(r32.slots.some((s) => s.fixture === 76 && s.match !== null)).toBe(true);
    expect(r16.slots.find((s) => s.fixture === 91)?.match).not.toBeNull();
  });

  it('places Brazil last-16 at the junction of fixtures 76 and 78', () => {
    const allKnockout = Object.entries(KNOCKOUT_FIXTURE_KICKOFFS)
      .filter(([fixture]) => Number(fixture) >= 73 && Number(fixture) <= 104)
      .map(([fixture, utcDate]) =>
        apiMatch({
          stage:
            Number(fixture) <= 88
              ? 'LAST_32'
              : Number(fixture) <= 96
                ? 'LAST_16'
                : Number(fixture) <= 100
                  ? 'QUARTER_FINALS'
                  : Number(fixture) <= 102
                    ? 'SEMI_FINALS'
                    : Number(fixture) === 103
                      ? 'THIRD_PLACE'
                      : 'FINAL',
          utcDate,
        }),
      );

    const bracket = buildKnockoutBracket(allKnockout);
    const r32 = bracket.rounds.find((r) => r.stage === 'LAST_32')!.slots;
    const r16 = bracket.rounds.find((r) => r.stage === 'LAST_16')!.slots;

    const brazilSlot = r16.findIndex((s) => s.fixture === 91);
    expect(brazilSlot).toBe(4);
    expect([r32[brazilSlot * 2].fixture, r32[brazilSlot * 2 + 1].fixture]).toEqual(
      BRACKET_FEEDERS[91],
    );
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

describe('getBracketFixtureNumber', () => {
  it('delegates to resolveKnockoutFixture', () => {
    const match = apiMatch({
      stage: 'LAST_32',
      utcDate: KNOCKOUT_FIXTURE_KICKOFFS[88],
    });
    expect(getBracketFixtureNumber(match)).toBe(88);
  });
});
