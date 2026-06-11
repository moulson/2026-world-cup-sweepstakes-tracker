export type MatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'EXTRA_TIME'
  | 'PENALTY_SHOOTOUT'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'AWARDED';

export type TeamResult = 'win' | 'loss' | 'draw' | 'pending';

export interface Team {
  id: number | null;
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest?: string | null;
}

export interface MatchScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  duration: string;
  fullTime: { home: number | null; away: number | null };
  halfTime?: { home: number | null; away: number | null };
}

export interface Match {
  id: number;
  utcDate: string;
  status: MatchStatus;
  minute?: number | null;
  matchday?: number | null;
  stage: string;
  group?: string | null;
  lastUpdated: string;
  homeTeam: Team;
  awayTeam: Team;
  score: MatchScore;
}

export interface ParticipantTeam {
  csvName: string;
  team: Team | null;
  flag: string;
}

export interface Participant {
  name: string;
  slug: string;
  profileImage: string;
  teams: ParticipantTeam[];
}

export interface SchedulerStatus {
  activeWindow: boolean;
  lastFetch: string | null;
  nextWindowStart: string | null;
  nextWindowEnd: string | null;
  activeMatches: number[];
  pollIntervalMs: number;
}

export interface MatchesCache {
  fetchedAt: string;
  matches: Match[];
  teams: Team[];
}

export interface ApiStatus extends SchedulerStatus {
  matchCount: number;
  cacheAge: string | null;
}
