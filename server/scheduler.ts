import type { Match, SchedulerStatus, Team } from '../shared/types.js';
import { FootballDataClient } from './footballDataClient.js';
import { cacheAge, isCacheStale, loadCache, saveCache } from './cache.js';
import type { MatchesCache } from '../shared/types.js';

const POLL_INTERVAL_MS = 60_000;
const MATCH_DURATION_MS = 2.5 * 60 * 60 * 1000;
const POST_MATCH_MS = 60 * 60 * 1000;
/** Node.js setTimeout max is 2^31-1 ms (~24.8 days); values above overflow to 1ms. */
const MAX_TIMEOUT_MS = 2_147_483_647;

const LIVE_STATUSES = new Set([
  'IN_PLAY',
  'PAUSED',
  'EXTRA_TIME',
  'PENALTY_SHOOTOUT',
]);

interface PollWindow {
  start: Date;
  end: Date;
  matchIds: number[];
}

type UpdateListener = (cache: MatchesCache) => void;

export class MatchWindowScheduler {
  private cache: MatchesCache | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private checkTimer: ReturnType<typeof setTimeout> | null = null;
  private finishedAt = new Map<number, string>();
  private listeners: UpdateListener[] = [];

  constructor(private readonly client: FootballDataClient) {}

  onUpdate(listener: UpdateListener): void {
    this.listeners.push(listener);
  }

  getCache(): MatchesCache | null {
    return this.cache;
  }

  async start(): Promise<void> {
    this.cache = await loadCache();

    if (!this.cache || isCacheStale(this.cache)) {
      await this.bootstrap();
    } else {
      this.recordFinishedMatches(this.cache.matches);
      this.scheduleNextCheck();
    }
  }

  async bootstrap(): Promise<void> {
    const [matches, teams] = await Promise.all([
      this.client.getMatches(),
      this.client.getTeams(),
    ]);

    await this.updateCache(matches, teams);
    this.scheduleNextCheck();
  }

  private async refresh(): Promise<void> {
    const matches = await this.client.getMatches();
    const teams = this.cache?.teams ?? (await this.client.getTeams());
    await this.updateCache(matches, teams);
    this.scheduleNextCheck();
  }

  private async updateCache(matches: Match[], teams: Team[]): Promise<void> {
    const now = new Date().toISOString();
    const previous = this.cache?.matches ?? [];

    for (const match of matches) {
      const prev = previous.find((m) => m.id === match.id);
      if (
        match.status === 'FINISHED' &&
        prev?.status !== 'FINISHED' &&
        !this.finishedAt.has(match.id)
      ) {
        this.finishedAt.set(match.id, now);
      }
    }

    this.recordFinishedMatches(matches);

    this.cache = {
      fetchedAt: now,
      matches: matches.sort(
        (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(),
      ),
      teams,
    };

    await saveCache(this.cache);
    this.listeners.forEach((l) => l(this.cache!));
  }

  private recordFinishedMatches(matches: Match[]): void {
    for (const match of matches) {
      if (match.status === 'FINISHED' && !this.finishedAt.has(match.id)) {
        this.finishedAt.set(match.id, match.lastUpdated);
      }
    }
  }

  private buildWindows(matches: Match[]): PollWindow[] {
    const now = Date.now();
    const windows: PollWindow[] = [];

    for (const match of matches) {
      const kickoff = new Date(match.utcDate).getTime();
      let end: number;

      if (match.status === 'FINISHED' || match.status === 'AWARDED') {
        const finished =
          this.finishedAt.get(match.id) ?? match.lastUpdated ?? match.utcDate;
        end = new Date(finished).getTime() + POST_MATCH_MS;
      } else if (LIVE_STATUSES.has(match.status)) {
        end = now + MATCH_DURATION_MS;
      } else {
        end = kickoff + MATCH_DURATION_MS;
      }

      if (end > now) {
        windows.push({
          start: new Date(Math.min(kickoff, now)),
          end: new Date(end),
          matchIds: [match.id],
        });
      }
    }

    return this.mergeWindows(windows);
  }

  mergeWindows(windows: PollWindow[]): PollWindow[] {
    if (windows.length === 0) return [];

    const sorted = [...windows].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );

    const merged: PollWindow[] = [{ ...sorted[0], matchIds: [...sorted[0].matchIds] }];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.start.getTime() <= last.end.getTime()) {
        last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
        last.matchIds.push(...current.matchIds);
      } else {
        merged.push({ ...current, matchIds: [...current.matchIds] });
      }
    }

    return merged;
  }

  private getActiveWindow(): PollWindow | null {
    if (!this.cache) return null;
    const now = Date.now();
    const windows = this.buildWindows(this.cache.matches);

    return (
      windows.find(
        (w) => w.start.getTime() <= now && w.end.getTime() > now,
      ) ?? null
    );
  }

  private getNextWindow(): PollWindow | null {
    if (!this.cache) return null;
    const now = Date.now();
    const windows = this.buildWindows(this.cache.matches);
    return windows.find((w) => w.end.getTime() > now) ?? null;
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private startPolling(): void {
    if (this.pollTimer) return;

    void this.refresh();
    this.pollTimer = setInterval(() => {
      void this.refresh();
    }, POLL_INTERVAL_MS);
  }

  private scheduleDelayedCheck(delayMs: number): void {
    const safeDelay = Math.min(Math.max(0, delayMs), MAX_TIMEOUT_MS);
    this.checkTimer = setTimeout(() => this.scheduleNextCheck(), safeDelay);
  }

  private scheduleNextCheck(): void {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }

    const active = this.getActiveWindow();
    if (active) {
      this.startPolling();
      const msUntilEnd = active.end.getTime() - Date.now() + 1000;
      this.scheduleDelayedCheck(msUntilEnd);
      return;
    }

    this.stopPolling();

    const next = this.getNextWindow();
    if (!next) return;

    const msUntilStart = Math.max(0, next.start.getTime() - Date.now());
    this.scheduleDelayedCheck(msUntilStart);
  }

  getStatus(): SchedulerStatus & { matchCount: number; cacheAge: string | null } {
    const active = this.getActiveWindow();
    const next = this.getNextWindow();

    return {
      activeWindow: active !== null,
      lastFetch: this.cache?.fetchedAt ?? null,
      nextWindowStart: next?.start.toISOString() ?? null,
      nextWindowEnd: next?.end.toISOString() ?? null,
      activeMatches: active?.matchIds ?? [],
      pollIntervalMs: POLL_INTERVAL_MS,
      matchCount: this.cache?.matches.length ?? 0,
      cacheAge: cacheAge(this.cache),
    };
  }
}
