/**
 * FIFA World Cup 2026 knockout bracket display order.
 *
 * football-data.org assigns each match an internal `id` (e.g. 537123) and puts the
 * official FIFA fixture number (1–104) in `matchday`. Bracket slots are keyed by
 * `matchday`, not `id`.
 *
 * Connector lines pair consecutive slots in each round, so the R32 column order is
 * derived from the R16 column order via BRACKET_FEEDERS — e.g. fixtures 76 and 78
 * (Brazil/Japan, Ivory Coast/Norway) must sit at the pair that feeds RO16 slot 91.
 *
 * Feeder map (child → parent fixture numbers):
 *   89 ← [74, 77]   90 ← [73, 75]   91 ← [76, 78]   92 ← [79, 80]
 *   93 ← [83, 84]   94 ← [81, 82]   95 ← [86, 88]   96 ← [85, 87]
 *   97 ← [89, 90]   98 ← [93, 94]   99 ← [91, 92]  100 ← [95, 96]
 *  101 ← [97, 98]  102 ← [99, 100]  104 ← [101, 102]
 */
const LAST_16_ORDER = [89, 90, 93, 94, 91, 92, 95, 96] as const;

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

/** Expand a round's display order into the previous round's pair order. */
function feedersToPreviousRoundOrder(parentOrder: readonly number[]): number[] {
  const slots: number[] = [];
  for (const parentFixture of parentOrder) {
    const feeders = BRACKET_FEEDERS[parentFixture];
    if (!feeders) continue;
    slots.push(feeders[0], feeders[1]);
  }
  return slots;
}

export const BRACKET_DISPLAY_ORDER: Readonly<Record<string, readonly number[]>> = {
  LAST_32: feedersToPreviousRoundOrder(LAST_16_ORDER),
  LAST_16: LAST_16_ORDER,
  QUARTER_FINALS: [97, 98, 99, 100],
  SEMI_FINALS: [101, 102],
  FINAL: [104],
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
