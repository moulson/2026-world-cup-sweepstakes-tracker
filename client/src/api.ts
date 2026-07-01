import type { ApiStatus, MatchesCache, Participant } from '../../shared/types';

export async function fetchParticipants(): Promise<Participant[]> {
  const res = await fetch('/api/participants');
  if (!res.ok) throw new Error('Failed to load participants');
  return res.json();
}

export async function fetchMatches(): Promise<MatchesCache> {
  const res = await fetch('/api/matches');
  if (!res.ok) throw new Error('Failed to load matches');
  return res.json();
}

export async function fetchStatus(): Promise<ApiStatus> {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Failed to load status');
  return res.json();
}

const SSE_RECONNECT_MS = 5_000;
const STALE_DATA_MS = 30 * 60 * 1000;

export function subscribeToUpdates(onUpdate: () => void): () => void {
  let source: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const connect = () => {
    if (closed) return;

    source = new EventSource('/api/events');

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'matches-updated') {
          onUpdate();
        }
      } catch {
        // ignore malformed events
      }
    };

    source.onerror = () => {
      source?.close();
      source = null;
      if (!closed) {
        reconnectTimer = setTimeout(connect, SSE_RECONNECT_MS);
      }
    };
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    source?.close();
  };
}

/** True when fixture data looks missing or hasn't been refreshed recently. */
export function isFixtureDataStale(status: ApiStatus | null): boolean {
  if (!status) return false;
  if (status.matchCount === 0) return true;
  if (!status.lastFetch) return true;
  return Date.now() - new Date(status.lastFetch).getTime() > STALE_DATA_MS;
}
