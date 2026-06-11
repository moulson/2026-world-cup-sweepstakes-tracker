import { describe, expect, it } from 'vitest';
import {
  buildParticipantMatcher,
  matchInvolvesParticipant,
  normalizeTeamName,
  teamMatchesMatcher,
} from './teamMatch';
import type { Match, Participant } from './types';

function makeParticipant(
  teams: Array<{ csvName: string; team?: Participant['teams'][0]['team'] }>,
): Participant {
  return {
    name: 'Test',
    slug: 'test',
    profileImage: '/profiles/test.jpg',
    teams: teams.map((entry) => ({
      csvName: entry.csvName,
      team: entry.team ?? null,
      flag: '🏳️',
    })),
  };
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 1,
    utcDate: '2026-06-15T19:00:00Z',
    status: 'TIMED',
    stage: 'GROUP_STAGE',
    group: 'GROUP_A',
    lastUpdated: '2026-06-15T21:00:00Z',
    homeTeam: { id: 10, name: 'England', shortName: 'England', tla: 'ENG' },
    awayTeam: { id: 20, name: 'USA', shortName: 'USA', tla: 'USA' },
    score: {
      winner: null,
      duration: 'REGULAR',
      fullTime: { home: null, away: null },
    },
    ...overrides,
  };
}

describe('normalizeTeamName', () => {
  it('normalizes accents and punctuation', () => {
    expect(normalizeTeamName("Côte d'Ivoire")).toBe('cote d ivoire');
    expect(normalizeTeamName('Bosnia & Herz')).toBe('bosnia herz');
  });
});

describe('buildParticipantMatcher', () => {
  it('matches by csv name when team id is unresolved', () => {
    const participant = makeParticipant([{ csvName: 'USA' }]);
    const matcher = buildParticipantMatcher(participant);
    const match = makeMatch();

    expect(matchInvolvesParticipant(match, matcher)).toBe(true);
    expect(teamMatchesMatcher(match.awayTeam, matcher)).toBe(true);
  });

  it('matches aliased csv names to api team names', () => {
    const participant = makeParticipant([{ csvName: 'Czech Republic' }]);
    const matcher = buildParticipantMatcher(participant);
    const match = makeMatch({
      homeTeam: {
        id: 99,
        name: 'Czechia',
        shortName: 'Czechia',
        tla: 'CZE',
      },
    });

    expect(matchInvolvesParticipant(match, matcher)).toBe(true);
  });

  it('matches by resolved team id and api names', () => {
    const participant = makeParticipant([
      {
        csvName: 'England',
        team: { id: 10, name: 'England', shortName: 'England', tla: 'ENG' },
      },
    ]);
    const matcher = buildParticipantMatcher(participant);

    expect(matchInvolvesParticipant(makeMatch(), matcher)).toBe(true);
  });
});
