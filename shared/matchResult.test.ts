import { describe, expect, it } from 'vitest';
import {
  buildParticipantMatcher,
  getParticipantTeamResult,
  teamResult,
} from './matchResult';
import type { Match, Participant } from './types';

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 1,
    utcDate: '2026-06-15T19:00:00Z',
    status: 'FINISHED',
    stage: 'GROUP_STAGE',
    group: 'GROUP_A',
    lastUpdated: '2026-06-15T21:00:00Z',
    homeTeam: { id: 10, name: 'England', shortName: 'England', tla: 'ENG' },
    awayTeam: { id: 20, name: 'USA', shortName: 'USA', tla: 'USA' },
    score: {
      winner: 'HOME_TEAM',
      duration: 'REGULAR',
      fullTime: { home: 2, away: 1 },
    },
    ...overrides,
  };
}

function makeParticipant(): Participant {
  return {
    name: 'Test',
    slug: 'test',
    profileImage: '/profiles/test.jpg',
    teams: [
      {
        csvName: 'USA',
        team: null,
        flag: '🇺🇸',
      },
    ],
  };
}

describe('teamResult', () => {
  it('returns win for winning home team', () => {
    expect(teamResult(10, makeMatch())).toBe('win');
  });

  it('returns loss for losing away team', () => {
    expect(teamResult(20, makeMatch())).toBe('loss');
  });

  it('returns draw', () => {
    const match = makeMatch({
      score: {
        winner: 'DRAW',
        duration: 'REGULAR',
        fullTime: { home: 1, away: 1 },
      },
    });
    expect(teamResult(10, match)).toBe('draw');
  });

  it('returns pending for scheduled matches', () => {
    const match = makeMatch({ status: 'SCHEDULED' });
    expect(teamResult(10, match)).toBe('pending');
  });
});

describe('getParticipantTeamResult', () => {
  it('returns result from participant team perspective by name', () => {
    const match = makeMatch();
    const matcher = buildParticipantMatcher(makeParticipant());
    expect(getParticipantTeamResult(match, matcher)).toBe('loss');
  });

  it('returns pending for upcoming participant fixtures', () => {
    const match = makeMatch({ status: 'TIMED' });
    const matcher = buildParticipantMatcher(makeParticipant());
    expect(getParticipantTeamResult(match, matcher)).toBe('pending');
  });

  it('returns win/loss for a knockout tie decided on penalties', () => {
    const match = makeMatch({
      stage: 'LAST_16',
      group: null,
      score: {
        winner: 'AWAY_TEAM',
        duration: 'PENALTY_SHOOTOUT',
        fullTime: { home: 1, away: 1 },
        penalties: { home: 4, away: 5 },
      },
    });
    const matcher = buildParticipantMatcher(makeParticipant());
    expect(getParticipantTeamResult(match, matcher)).toBe('win');
  });
});
