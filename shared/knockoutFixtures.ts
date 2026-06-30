import type { Match } from './types.js';

/** Official FIFA kickoff times (UTC) for knockout fixtures 73–104. */
export const KNOCKOUT_FIXTURE_KICKOFFS: Readonly<Record<number, string>> = {
  73: '2026-06-28T19:00:00Z',
  74: '2026-06-29T20:30:00Z',
  75: '2026-06-30T01:00:00Z',
  76: '2026-06-29T17:00:00Z',
  77: '2026-06-30T21:00:00Z',
  78: '2026-06-30T17:00:00Z',
  79: '2026-07-01T01:00:00Z',
  80: '2026-07-01T16:00:00Z',
  81: '2026-07-02T00:00:00Z',
  82: '2026-07-01T20:00:00Z',
  83: '2026-07-02T23:00:00Z',
  84: '2026-07-02T19:00:00Z',
  85: '2026-07-03T03:00:00Z',
  86: '2026-07-03T22:00:00Z',
  87: '2026-07-04T01:30:00Z',
  88: '2026-07-03T18:00:00Z',
  89: '2026-07-04T21:00:00Z',
  90: '2026-07-04T17:00:00Z',
  91: '2026-07-05T20:00:00Z',
  92: '2026-07-06T00:00:00Z',
  93: '2026-07-06T19:00:00Z',
  94: '2026-07-07T00:00:00Z',
  95: '2026-07-07T16:00:00Z',
  96: '2026-07-07T20:00:00Z',
  97: '2026-07-09T20:00:00Z',
  98: '2026-07-10T19:00:00Z',
  99: '2026-07-11T21:00:00Z',
  100: '2026-07-12T01:00:00Z',
  101: '2026-07-14T19:00:00Z',
  102: '2026-07-15T19:00:00Z',
  103: '2026-07-18T21:00:00Z',
  104: '2026-07-19T19:00:00Z',
};

const FIXTURE_STAGE: Readonly<Record<number, string>> = {
  ...Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [73 + i, 'LAST_32']),
  ),
  ...Object.fromEntries(
    Array.from({ length: 8 }, (_, i) => [89 + i, 'LAST_16']),
  ),
  ...Object.fromEntries(
    Array.from({ length: 4 }, (_, i) => [97 + i, 'QUARTER_FINALS']),
  ),
  101: 'SEMI_FINALS',
  102: 'SEMI_FINALS',
  103: 'THIRD_PLACE',
  104: 'FINAL',
};

/** Chronological fixture order per stage when API matchday is 1..n within the round. */
const STAGE_MATCHDAY_TO_FIXTURE: Readonly<Record<string, readonly number[]>> = {
  LAST_32: [73, 74, 76, 75, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 88, 87],
  LAST_16: [90, 89, 91, 92, 93, 94, 95, 96],
  QUARTER_FINALS: [97, 98, 99, 100],
  SEMI_FINALS: [101, 102],
  FINAL: [104],
  THIRD_PLACE: [103],
};

const KNOCKOUT_STAGES = new Set(Object.keys(STAGE_MATCHDAY_TO_FIXTURE));

const KICKOFF_TOLERANCE_MS = 2 * 60 * 60 * 1000;

export interface FixtureResolvableMatch {
  id: number;
  matchday?: number | null;
  stage: string;
  utcDate: string;
}

function isKnockoutStage(stage: string): boolean {
  return KNOCKOUT_STAGES.has(stage);
}

function fixtureFromMatchday(stage: string, matchday: number): number | null {
  if (matchday >= 73 && matchday <= 104) {
    return matchday;
  }

  const order = STAGE_MATCHDAY_TO_FIXTURE[stage];
  if (!order || matchday < 1 || matchday > order.length) {
    return null;
  }

  return order[matchday - 1] ?? null;
}

function fixtureFromKickoff(stage: string, utcDate: string): number | null {
  const kickoffMs = Date.parse(utcDate);
  if (Number.isNaN(kickoffMs)) return null;

  let best: { fixture: number; delta: number } | null = null;

  for (const [fixtureStr, kickoff] of Object.entries(KNOCKOUT_FIXTURE_KICKOFFS)) {
    const fixture = Number(fixtureStr);
    if (FIXTURE_STAGE[fixture] !== stage) continue;

    const delta = Math.abs(kickoffMs - Date.parse(kickoff));
    if (delta > KICKOFF_TOLERANCE_MS) continue;

    if (!best || delta < best.delta) {
      best = { fixture, delta };
    }
  }

  return best?.fixture ?? null;
}

/** Map a football-data.org match onto the official FIFA fixture number (73–104). */
export function resolveKnockoutFixture(match: FixtureResolvableMatch): number | null {
  if (!isKnockoutStage(match.stage)) {
    return null;
  }

  if (match.matchday != null) {
    const fromMatchday = fixtureFromMatchday(match.stage, match.matchday);
    if (fromMatchday != null) {
      return fromMatchday;
    }
  }

  const fromKickoff = fixtureFromKickoff(match.stage, match.utcDate);
  if (fromKickoff != null) {
    return fromKickoff;
  }

  return null;
}

/** @deprecated Use resolveKnockoutFixture */
export function getBracketFixtureNumber(match: FixtureResolvableMatch): number | null {
  return resolveKnockoutFixture(match);
}

export function indexMatchesByFixture(matches: Match[]): Map<number, Match> {
  const byFixture = new Map<number, Match>();
  for (const match of matches) {
    const fixture = resolveKnockoutFixture(match);
    if (fixture != null) {
      byFixture.set(fixture, match);
    }
  }
  return byFixture;
}
