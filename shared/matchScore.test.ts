import { describe, expect, it } from 'vitest';
import {
  getDisplayScore,
  normalizeMatchScore,
  readFullTime,
  readPenalties,
} from './matchScore';
import type { MatchScore } from './types';

describe('readFullTime', () => {
  it('reads home/away fields', () => {
    const score: MatchScore = {
      winner: 'HOME_TEAM',
      duration: 'REGULAR',
      fullTime: { home: 2, away: 1 },
    };
    expect(readFullTime(score)).toEqual({ home: 2, away: 1 });
  });

  it('reads homeTeam/awayTeam fields from the API', () => {
    const score = {
      winner: 'HOME_TEAM',
      duration: 'PENALTY_SHOOTOUT',
      fullTime: { homeTeam: 2, awayTeam: 1 },
      penalties: { homeTeam: 5, awayTeam: 4 },
      regularTime: { homeTeam: 1, awayTeam: 1 },
    } as unknown as MatchScore;

    expect(readFullTime(score)).toEqual({ home: 2, away: 1 });
    expect(readPenalties(score)).toEqual({ home: 5, away: 4 });
  });
});

describe('normalizeMatchScore', () => {
  it('canonicalizes API penalty shootout scores', () => {
    const normalized = normalizeMatchScore({
      winner: 'AWAY_TEAM',
      duration: 'PENALTY_SHOOTOUT',
      fullTime: { homeTeam: 1, awayTeam: 1 },
      regularTime: { homeTeam: 1, awayTeam: 1 },
      penalties: { homeTeam: 4, awayTeam: 5 },
    });

    expect(normalized.fullTime).toEqual({ home: 1, away: 1 });
    expect(normalized.regularTime).toEqual({ home: 1, away: 1 });
    expect(normalized.penalties).toEqual({ home: 4, away: 5 });
  });
});

describe('getDisplayScore', () => {
  it('shows regular time plus penalty note after a shootout', () => {
    const score = normalizeMatchScore({
      winner: 'HOME_TEAM',
      duration: 'PENALTY_SHOOTOUT',
      fullTime: { homeTeam: 1, awayTeam: 1 },
      regularTime: { homeTeam: 1, awayTeam: 1 },
      penalties: { homeTeam: 5, awayTeam: 4 },
    });

    expect(getDisplayScore(score)).toEqual({
      home: 1,
      away: 1,
      penaltyNote: '5–4 pens',
    });
  });
});
