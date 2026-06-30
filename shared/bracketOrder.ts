/**
 * FIFA World Cup 2026 knockout bracket display order.
 *
 * football-data.org match ids follow FIFA numbering (73–104). Within each round
 * the ids are not in feeder-pair order — e.g. RO16 match 91 is fed by R32
 * matches 76 and 78, not the consecutive ids 77 and 78. To draw connector lines
 * correctly, matches are reordered so each consecutive pair feeds the next round.
 *
 * Feeder map (child → parent match ids):
 *   89 ← [74, 77]   90 ← [73, 75]   91 ← [76, 78]   92 ← [79, 80]
 *   93 ← [83, 84]   94 ← [81, 82]   95 ← [86, 88]   96 ← [85, 87]
 *   97 ← [89, 90]   98 ← [93, 94]   99 ← [91, 92]  100 ← [95, 96]
 *  101 ← [97, 98]  102 ← [99, 100]  104 ← [101, 102]
 */
export const BRACKET_DISPLAY_ORDER: Readonly<Record<string, readonly number[]>> = {
  LAST_32: [74, 77, 73, 75, 76, 78, 79, 80, 83, 84, 81, 82, 86, 88, 85, 87],
  LAST_16: [89, 90, 91, 92, 93, 94, 95, 96],
  QUARTER_FINALS: [97, 98, 99, 100],
  SEMI_FINALS: [101, 102],
  FINAL: [104],
};

/** Parent match id for each pair of consecutive slots in the previous round. */
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

/**
 * Order knockout matches for bracket display so connector lines match FIFA feeders.
 * Unknown ids are appended in ascending order after the mapped slots.
 */
export function sortMatchesForBracket<T extends { id: number }>(
  stage: string,
  matches: T[],
): T[] {
  const order = BRACKET_DISPLAY_ORDER[stage];
  if (!order?.length) {
    return [...matches].sort((a, b) => a.id - b.id);
  }

  const byId = new Map(matches.map((match) => [match.id, match]));
  const ordered: T[] = [];
  const placed = new Set<number>();

  for (const id of order) {
    const match = byId.get(id);
    if (match) {
      ordered.push(match);
      placed.add(id);
    }
  }

  const remainder = matches
    .filter((match) => !placed.has(match.id))
    .sort((a, b) => a.id - b.id);
  return [...ordered, ...remainder];
}
