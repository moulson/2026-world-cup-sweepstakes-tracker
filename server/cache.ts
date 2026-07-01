import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeMatch } from '../shared/matchScore.js';
import type { MatchesCache } from '../shared/types.js';
import { CACHE_DIR, MATCHES_CACHE } from './paths.js';

const STALE_MS = 24 * 60 * 60 * 1000;

export async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export async function loadCache(): Promise<MatchesCache | null> {
  try {
    const raw = await fs.readFile(MATCHES_CACHE, 'utf-8');
    const cache = JSON.parse(raw) as MatchesCache;
    return {
      ...cache,
      matches: cache.matches.map(normalizeMatch),
    };
  } catch {
    return null;
  }
}

export async function saveCache(cache: MatchesCache): Promise<void> {
  await ensureCacheDir();
  await fs.writeFile(MATCHES_CACHE, JSON.stringify(cache, null, 2), 'utf-8');
}

export function isCacheEmpty(cache: MatchesCache | null): boolean {
  return !cache || cache.matches.length === 0;
}

export function isCacheStale(cache: MatchesCache | null): boolean {
  if (!cache) return true;
  if (cache.matches.length === 0) return true;
  const age = Date.now() - new Date(cache.fetchedAt).getTime();
  return age > STALE_MS;
}

export function cacheAge(cache: MatchesCache | null): string | null {
  if (!cache) return null;
  return cache.fetchedAt;
}
