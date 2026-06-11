import type { Match, Team } from '../shared/types.js';

const BASE_URL = 'https://api.football-data.org/v4';
const SEASON = 2026;
const COMPETITION = 'WC';

interface MatchesResponse {
  matches: Match[];
}

interface TeamsResponse {
  teams: Team[];
}

export class FootballDataClient {
  constructor(private readonly token: string) {}

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'X-Auth-Token': this.token,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`football-data.org ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
  }

  async getMatches(): Promise<Match[]> {
    const data = await this.fetch<MatchesResponse>(
      `/competitions/${COMPETITION}/matches?season=${SEASON}`,
    );
    return data.matches;
  }

  async getTeams(): Promise<Team[]> {
    const data = await this.fetch<TeamsResponse>(
      `/competitions/${COMPETITION}/teams?season=${SEASON}`,
    );
    return data.teams;
  }
}
