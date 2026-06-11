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

export function subscribeToUpdates(onUpdate: () => void): () => void {
  const source = new EventSource('/api/events');

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
    source.close();
  };

  return () => source.close();
}
