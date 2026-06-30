import type { Match, MatchScore } from './types.js';

export interface ScoreSide {
  home: number | null;
  away: number | null;
}

type ApiScoreSide = {
  home?: number | null;
  away?: number | null;
  homeTeam?: number | null;
  awayTeam?: number | null;
};

const LIVE_STATUSES = new Set([
  'IN_PLAY',
  'PAUSED',
  'EXTRA_TIME',
  'PENALTY_SHOOTOUT',
]);

/** Reads home/away goals from API score nodes that use either naming scheme. */
export function readScoreSide(side: ApiScoreSide | null | undefined): ScoreSide {
  if (!side) return { home: null, away: null };
  return {
    home: side.home ?? side.homeTeam ?? null,
    away: side.away ?? side.awayTeam ?? null,
  };
}

export function readFullTime(score: MatchScore | null | undefined): ScoreSide {
  if (!score?.fullTime) return { home: null, away: null };
  return readScoreSide(score.fullTime as ApiScoreSide);
}

export function readRegularTime(score: MatchScore | null | undefined): ScoreSide | null {
  if (!score?.regularTime) return null;
  return readScoreSide(score.regularTime as ApiScoreSide);
}

export function readPenalties(score: MatchScore | null | undefined): ScoreSide | null {
  if (!score?.penalties) return null;
  const pens = readScoreSide(score.penalties as ApiScoreSide);
  if (pens.home === null && pens.away === null) return null;
  return pens;
}

export function isPenaltyDecided(score: MatchScore | null | undefined): boolean {
  if (!score) return false;
  const duration = score.duration?.toUpperCase() ?? '';
  return duration === 'PENALTIES' || duration === 'PENALTY_SHOOTOUT';
}

export function hasUsableScore(side: ScoreSide): boolean {
  return side.home !== null && side.away !== null;
}

export interface DisplayScore {
  home: number;
  away: number;
  penaltyNote: string | null;
}

/** Score text for fixtures and the bracket. */
export function getDisplayScore(score: MatchScore | null | undefined): DisplayScore | null {
  if (!score) return null;

  const pens = readPenalties(score);
  const regular = readRegularTime(score);
  const fullTime = readFullTime(score);

  if (pens && regular && hasUsableScore(regular)) {
    return {
      home: regular.home!,
      away: regular.away!,
      penaltyNote: `${pens.home ?? 0}–${pens.away ?? 0} pens`,
    };
  }

  if (pens && hasUsableScore(fullTime) && fullTime.home === fullTime.away) {
    return {
      home: fullTime.home!,
      away: fullTime.away!,
      penaltyNote: `${pens.home ?? 0}–${pens.away ?? 0} pens`,
    };
  }

  if (!hasUsableScore(fullTime)) return null;

  return {
    home: fullTime.home!,
    away: fullTime.away!,
    penaltyNote: isPenaltyDecided(score) && pens ? `${pens.home ?? 0}–${pens.away ?? 0} pens` : null,
  };
}

/** Canonicalize football-data.org score nodes before caching or computing results. */
export function normalizeMatchScore(raw: unknown): MatchScore {
  const score = (raw ?? {}) as Record<string, unknown>;
  const winner = (score.winner as MatchScore['winner']) ?? null;
  const duration = typeof score.duration === 'string' ? score.duration : 'REGULAR';

  const normalizeSide = (node: unknown) => readScoreSide(node as ApiScoreSide);

  const fullTime = normalizeSide(score.fullTime);
  const halfTime = score.halfTime ? normalizeSide(score.halfTime) : undefined;
  const regularTime = score.regularTime ? normalizeSide(score.regularTime) : undefined;
  const extraTime = score.extraTime ? normalizeSide(score.extraTime) : undefined;
  const penalties = score.penalties ? normalizeSide(score.penalties) : undefined;

  return {
    winner,
    duration,
    fullTime,
    ...(halfTime ? { halfTime } : {}),
    ...(regularTime ? { regularTime } : {}),
    ...(extraTime ? { extraTime } : {}),
    ...(penalties ? { penalties } : {}),
  };
}

export function normalizeMatch(match: Match): Match {
  return {
    ...match,
    score: normalizeMatchScore(match.score),
  };
}

export function isLiveMatch(match: Match): boolean {
  return LIVE_STATUSES.has(match.status);
}

export function getLiveMatches(matches: Match[]): Match[] {
  return matches.filter(isLiveMatch);
}
