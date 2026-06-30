import { describe, expect, it } from 'vitest';
import {
  computeEliminatedTeams,
  getKnockoutMatchLoser,
  isParticipantFullyEliminated,
  isParticipantTeamEliminated,
} from './elimination';
import type { Match, Participant, ParticipantTeam } from './types';

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: Math.floor(Math.random() * 1_000_000),
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

function entry(csvName: string, id: number | null): ParticipantTeam {
  return {
    csvName,
    flag: '',
    team: id == null ? null : { id, name: csvName, shortName: csvName, tla: null },
  };
}

function makeParticipant(teams: ParticipantTeam[]): Participant {
  return {
    name: 'Test',
    slug: 'test',
    profileImage: '/profiles/test.jpg',
    teams,
  };
}

describe('getKnockoutMatchLoser', () => {
  it('returns the away side when the home team wins in regulation', () => {
    const match = makeMatch({
      stage: 'LAST_16',
      group: null,
      score: { winner: 'HOME_TEAM', duration: 'REGULAR', fullTime: { home: 2, away: 0 } },
    });

    expect(getKnockoutMatchLoser(match)?.id).toBe(20);
  });

  it('returns the home side when a penalty shootout is won by the away team', () => {
    const match = makeMatch({
      stage: 'QUARTER_FINALS',
      group: null,
      score: { winner: 'AWAY_TEAM', duration: 'PENALTIES', fullTime: { home: 1, away: 1 } },
    });

    expect(getKnockoutMatchLoser(match)?.id).toBe(10);
  });

  it('returns null for unfinished ties', () => {
    const match = makeMatch({ stage: 'LAST_16', group: null, status: 'TIMED' });
    expect(getKnockoutMatchLoser(match)).toBeNull();
  });
});

describe('isParticipantFullyEliminated', () => {
  it('is true when every team on the card is eliminated', () => {
    const elim = computeEliminatedTeams([
      makeMatch({
        stage: 'LAST_16',
        group: null,
        homeTeam: { id: 1, name: 'Brazil', shortName: 'Brazil', tla: 'BRA' },
        awayTeam: { id: 2, name: 'Japan', shortName: 'Japan', tla: 'JPN' },
        score: { winner: 'HOME_TEAM', duration: 'REGULAR', fullTime: { home: 2, away: 1 } },
      }),
    ]);

    const participant = makeParticipant([entry('Japan', 2), entry('Wales', 99)]);
    expect(isParticipantFullyEliminated(participant, elim)).toBe(false);

    const out = makeParticipant([entry('Japan', 2)]);
    expect(isParticipantFullyEliminated(out, elim)).toBe(true);
  });
});

describe('computeEliminatedTeams', () => {
  it('marks the loser of a finished knockout tie as eliminated', () => {
    const matches = [
      makeMatch({
        stage: 'LAST_16',
        group: null,
        homeTeam: { id: 1, name: 'Brazil', shortName: 'Brazil', tla: 'BRA' },
        awayTeam: { id: 2, name: 'Japan', shortName: 'Japan', tla: 'JPN' },
        score: { winner: 'HOME_TEAM', duration: 'REGULAR', fullTime: { home: 3, away: 1 } },
      }),
    ];

    const elim = computeEliminatedTeams(matches);
    expect(elim.teamIds.has(2)).toBe(true);
    expect(elim.teamIds.has(1)).toBe(false);
  });

  it('eliminates the side that lost a penalty shootout (level full-time score)', () => {
    const matches = [
      makeMatch({
        stage: 'QUARTER_FINALS',
        group: null,
        homeTeam: { id: 1, name: 'Brazil', shortName: 'Brazil', tla: 'BRA' },
        awayTeam: { id: 2, name: 'Japan', shortName: 'Japan', tla: 'JPN' },
        score: { winner: 'AWAY_TEAM', duration: 'PENALTIES', fullTime: { home: 1, away: 1 } },
      }),
    ];

    const elim = computeEliminatedTeams(matches);
    expect(elim.teamIds.has(1)).toBe(true);
    expect(elim.teamIds.has(2)).toBe(false);
  });

  it('eliminates group teams that did not reach the knockout draw', () => {
    const matches = [
      makeMatch({
        stage: 'GROUP_STAGE',
        homeTeam: { id: 1, name: 'Brazil', shortName: 'Brazil', tla: 'BRA' },
        awayTeam: { id: 99, name: 'Wales', shortName: 'Wales', tla: 'WAL' },
      }),
      makeMatch({
        stage: 'LAST_32',
        group: null,
        status: 'TIMED',
        homeTeam: { id: 1, name: 'Brazil', shortName: 'Brazil', tla: 'BRA' },
        awayTeam: { id: 2, name: 'Japan', shortName: 'Japan', tla: 'JPN' },
        score: { winner: null, duration: 'REGULAR', fullTime: { home: null, away: null } },
      }),
    ];

    const elim = computeEliminatedTeams(matches);
    expect(elim.teamIds.has(99)).toBe(true);
    expect(elim.teamIds.has(1)).toBe(false);
  });

  it('does not eliminate group teams while the group stage is still running', () => {
    const matches = [
      makeMatch({
        stage: 'GROUP_STAGE',
        status: 'TIMED',
        homeTeam: { id: 1, name: 'Brazil', shortName: 'Brazil', tla: 'BRA' },
        awayTeam: { id: 99, name: 'Wales', shortName: 'Wales', tla: 'WAL' },
        score: { winner: null, duration: 'REGULAR', fullTime: { home: null, away: null } },
      }),
    ];

    const elim = computeEliminatedTeams(matches);
    expect(elim.teamIds.size).toBe(0);
  });
});

describe('isParticipantTeamEliminated', () => {
  it('matches by resolved team id', () => {
    const elim = { teamIds: new Set([99]), normalizedNames: new Set<string>() };
    expect(isParticipantTeamEliminated(entry('Wales', 99), elim)).toBe(true);
    expect(isParticipantTeamEliminated(entry('Brazil', 1), elim)).toBe(false);
  });

  it('falls back to the csv name when the team id is unresolved', () => {
    const elim = { teamIds: new Set<number>(), normalizedNames: new Set(['wales']) };
    expect(isParticipantTeamEliminated(entry('Wales', null), elim)).toBe(true);
  });
});
