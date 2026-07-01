import { describe, expect, it } from 'vitest';
import { isCacheEmpty, isCacheStale } from './cache.js';
import type { MatchesCache } from '../shared/types.js';
import { MatchWindowScheduler } from './scheduler.js';
import type { Match } from '../shared/types.js';

function makeMatch(overrides: Partial<Match> & Pick<Match, 'id' | 'utcDate' | 'status'>): Match {
  return {
    stage: 'LAST_16',
    lastUpdated: overrides.utcDate,
    homeTeam: { id: 1, name: 'Home', shortName: 'Home', tla: 'HOM' },
    awayTeam: { id: 2, name: 'Away', shortName: 'Away', tla: 'AWY' },
    score: {
      winner: null,
      duration: 'REGULAR',
      fullTime: { home: null, away: null },
    },
    ...overrides,
  };
}

describe('cache staleness', () => {
  const freshCache: MatchesCache = {
    fetchedAt: new Date().toISOString(),
    matches: [makeMatch({ id: 1, utcDate: '2026-07-01T18:00:00Z', status: 'SCHEDULED' })],
    teams: [],
  };

  it('treats empty match list as stale', () => {
    const empty: MatchesCache = { ...freshCache, matches: [] };
    expect(isCacheEmpty(empty)).toBe(true);
    expect(isCacheStale(empty)).toBe(true);
  });

  it('treats populated cache as fresh when recently fetched', () => {
    expect(isCacheStale(freshCache)).toBe(false);
  });
});

describe('buildWindows', () => {
  const scheduler = new MatchWindowScheduler({
    getMatches: async () => [],
    getTeams: async () => [],
  } as never);

  it('does not open a window for future matches until kickoff', () => {
    const now = new Date('2026-07-01T10:00:00Z').getTime();
    const match = makeMatch({
      id: 1,
      utcDate: '2026-07-01T18:00:00Z',
      status: 'SCHEDULED',
    });

    const windows = scheduler.buildWindows([match], now);
    expect(windows).toHaveLength(1);
    expect(windows[0].start.toISOString()).toBe('2026-07-01T18:00:00.000Z');
    expect(windows[0].end.toISOString()).toBe('2026-07-01T20:30:00.000Z');
  });

  it('keeps polling when kickoff passed but status is still SCHEDULED', () => {
    const now = new Date('2026-07-01T20:00:00Z').getTime();
    const match = makeMatch({
      id: 2,
      utcDate: '2026-07-01T18:00:00Z',
      status: 'SCHEDULED',
    });

    const windows = scheduler.buildWindows([match], now);
    expect(windows).toHaveLength(1);
    expect(windows[0].start.toISOString()).toBe('2026-07-01T18:00:00.000Z');
    expect(windows[0].end.getTime()).toBe(now + 2.5 * 60 * 60 * 1000);
  });

  it('merges overlapping windows', () => {
    const now = new Date('2026-06-15T18:00:00Z').getTime();
    const windows = scheduler.buildWindows(
      [
        makeMatch({ id: 1, utcDate: '2026-06-15T18:00:00Z', status: 'IN_PLAY' }),
        makeMatch({ id: 2, utcDate: '2026-06-15T20:00:00Z', status: 'SCHEDULED' }),
      ],
      now,
    );

    expect(windows).toHaveLength(1);
    expect(windows[0].matchIds).toEqual([1, 2]);
  });
});

describe('empty API response guard', () => {
  it('rejects overwriting a populated cache with an empty API response', () => {
    const scheduler = new MatchWindowScheduler({
      getMatches: async () => [],
      getTeams: async () => [],
    } as never);

    const existing = makeMatch({
      id: 99,
      utcDate: '2026-07-01T18:00:00Z',
      status: 'SCHEDULED',
    });

    (scheduler as unknown as { cache: MatchesCache }).cache = {
      fetchedAt: '2026-07-01T07:00:00Z',
      matches: [existing],
      teams: [],
    };

    const reject = (scheduler as unknown as { shouldRejectEmptyApiResponse: (m: Match[]) => boolean })
      .shouldRejectEmptyApiResponse.bind(scheduler);

    expect(reject([])).toBe(true);
    expect(reject([existing])).toBe(false);
  });
});
