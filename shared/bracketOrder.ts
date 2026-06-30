/**
 * FIFA World Cup 2026 knockout bracket display order.
 *
 * football-data.org assigns each match an internal `id` (e.g. 537123) and puts the
 * official FIFA fixture number (1–104) in `matchday`. Bracket slots are keyed by
 * `matchday`, not `id`. Within each round the fixture numbers are not in feeder-
 * pair order — e.g. RO16 match 91 is fed by R32 matches 76 and 78, not 77 and 78.
 *
 * Feeder map (child → parent fixture numbers):
 *   89 ← [74, 77]   90 ← [73, 75]   91 ← [76, 78]   92 ← [79, 80]
 *   93 ← [83, 84]   94 ← [81, 82]   95 ← [86, 88]   96 ← [85, 87]
 *   97 ← [89, 90]   98 ← [93, 94]   99 ← [91, 92]  100 ← [95, 96]
 *  101 ← [97, 98]  102 ← [99, 100]  104 ← [101, 102]
 */
export const BRACKET_DISPLAY_ORDER: Readonly<Record<string, readonly number[]>> = {
  LAST_32: [74, 77, 73, 75, 76, 78, 79, 80, 83, 84, 81, 82, 86, 88, 85, 87],
  // Pair order matches the quarter-final feeder map (98 ← 93+94, 99 ← 91+92).
  LAST_16: [89, 90, 93, 94, 91, 92, 95, 96],
  QUARTER_FINALS: [97, 98, 99, 100],
  SEMI_FINALS: [101, 102],
  FINAL: [104],
};

/** Parent fixture number for each pair of consecutive slots in the previous round. */
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

export interface BracketMatchRef {
  id: number;
  matchday?: number | null;
}

/** Official FIFA fixture number used for bracket slot lookup. */
export function getBracketFixtureNumber(match: BracketMatchRef): number | null {
  if (match.matchday != null && match.matchday >= 1 && match.matchday <= 104) {
    return match.matchday;
  }
  return null;
}

export type BracketSlot<T extends BracketMatchRef> = T | null;

/**
 * Fixed bracket slots for a knockout round. Missing fixtures (not yet returned by
 * the API) are `null` so published ties stay in the correct vertical position.
 */
export function buildBracketSlots<T extends BracketMatchRef>(
  stage: string,
  matches: T[],
): BracketSlot<T>[] {
  const order = BRACKET_DISPLAY_ORDER[stage];
  if (!order?.length || matches.length === 0) {
    return matches.length ? [...matches].sort((a, b) => a.id - b.id) : [];
  }

  const byFixture = new Map<number, T>();
  const unmapped: T[] = [];

  for (const match of matches) {
    const fixture = getBracketFixtureNumber(match);
    if (fixture != null && order.includes(fixture)) {
      byFixture.set(fixture, match);
    } else {
      unmapped.push(match);
    }
  }

  const slots: BracketSlot<T>[] = order.map((fixture) => byFixture.get(fixture) ?? null);

  if (unmapped.length === 0) {
    return slots;
  }

  // No recognised fixture numbers — fall back to id order without placeholder grid.
  if (byFixture.size === 0) {
    return [...matches].sort((a, b) => a.id - b.id);
  }

  unmapped.sort((a, b) => a.id - b.id);
  return [...slots, ...unmapped];
}

/** Non-null slots only — for callers that do not need placeholders. */
export function sortMatchesForBracket<T extends BracketMatchRef>(
  stage: string,
  matches: T[],
): T[] {
  return buildBracketSlots(stage, matches).filter(
    (match): match is T => match !== null,
  );
}
