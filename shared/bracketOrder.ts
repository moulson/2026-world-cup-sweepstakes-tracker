import type { Match } from './types.js';

/**
 * FIFA World Cup 2026 predetermined knockout bracket (fixtures 73–104).
 *
 * The full tree was fixed at the final draw. football-data.org stores the
 * official fixture number in `matchday` (not the API's internal `id`). We
 * always render every slot in this tree and overlay live data when available.
 *
 * Feeder map (parent ← [feederA, feederB]):
 *   89 ← [74, 77]   90 ← [73, 75]   91 ← [76, 78]   92 ← [79, 80]
 *   93 ← [83, 84]   94 ← [81, 82]   95 ← [86, 88]   96 ← [85, 87]
 *   97 ← [89, 90]   98 ← [93, 94]   99 ← [91, 92]  100 ← [95, 96]
 *  101 ← [97, 98]  102 ← [99, 100]  104 ← [101, 102]
 */
export const BRACKET_FEEDERS: Readonly<Record<number, readonly [number, number]>> = {
  89: [74, 77],
  90: [73, 75],
  91: [76, 78],
  92: [79, 80],
  93: [83, 84],
  94: [81, 82],
  95: [86, 88],
  96: [85, 87],
  97: [89, 90],
  98: [93, 94],
  99: [91, 92],
  100: [95, 96],
  101: [97, 98],
  102: [99, 100],
  104: [101, 102],
};

/** Display order for each knockout round — consecutive pairs feed the next column. */
const LAST_16_FIXTURES = [89, 90, 93, 94, 91, 92, 95, 96] as const;

function feedersToPreviousRoundOrder(parentFixtures: readonly number[]): readonly number[] {
  const slots: number[] = [];
  for (const parent of parentFixtures) {
    const feeders = BRACKET_FEEDERS[parent];
    if (!feeders) continue;
    slots.push(feeders[0], feeders[1]);
  }
  return slots;
}

export const KNOCKOUT_ROUNDS = [
  {
    stage: 'LAST_32',
    fixtures: feedersToPreviousRoundOrder(LAST_16_FIXTURES),
  },
  { stage: 'LAST_16', fixtures: LAST_16_FIXTURES },
  { stage: 'QUARTER_FINALS', fixtures: [97, 98, 99, 100] as const },
  { stage: 'SEMI_FINALS', fixtures: [101, 102] as const },
  { stage: 'FINAL', fixtures: [104] as const },
] as const;

export const THIRD_PLACE_FIXTURE = 103;

export interface BracketMatchRef {
  id: number;
  matchday?: number | null;
}

export interface BracketSlot {
  fixture: number;
  match: Match | null;
}

export interface KnockoutBracket {
  rounds: Array<{ stage: string; slots: BracketSlot[] }>;
  thirdPlace: BracketSlot;
}

/** Official FIFA fixture number used for bracket slot lookup. */
export function getBracketFixtureNumber(match: BracketMatchRef): number | null {
  if (match.matchday != null && match.matchday >= 1 && match.matchday <= 104) {
    return match.matchday;
  }
  return null;
}

/** Index every match by FIFA fixture number (matchday). */
export function indexMatchesByFixture(matches: Match[]): Map<number, Match> {
  const byFixture = new Map<number, Match>();
  for (const match of matches) {
    const fixture = getBracketFixtureNumber(match);
    if (fixture != null) {
      byFixture.set(fixture, match);
    }
  }
  return byFixture;
}

/**
 * Build the full predetermined knockout tree, overlaying API data where
 * published. Unfilled slots stay null (rendered as TBD in the UI).
 */
export function buildKnockoutBracket(matches: Match[]): KnockoutBracket {
  const byFixture = indexMatchesByFixture(matches);

  const rounds = KNOCKOUT_ROUNDS.map((round) => ({
    stage: round.stage,
    slots: round.fixtures.map((fixture) => ({
      fixture,
      match: byFixture.get(fixture) ?? null,
    })),
  }));

  return {
    rounds,
    thirdPlace: {
      fixture: THIRD_PLACE_FIXTURE,
      match: byFixture.get(THIRD_PLACE_FIXTURE) ?? null,
    },
  };
}
