import fs from 'node:fs/promises';
import {
  normalizeTeamName,
  resolveCsvLookupName,
  type TeamAliasMap,
} from '../shared/teamMatch.js';
import type { Team } from '../shared/types.js';
import { TEAM_ALIASES } from './paths.js';

async function loadAliases(): Promise<TeamAliasMap> {
  try {
    const raw = await fs.readFile(TEAM_ALIASES, 'utf-8');
    return JSON.parse(raw) as TeamAliasMap;
  } catch {
    return {};
  }
}

function findTeam(lookupName: string, teams: Team[]): Team | null {
  const normalized = normalizeTeamName(lookupName);

  for (const team of teams) {
    const candidates = [team.name, team.shortName, team.tla].filter(
      (c): c is string => Boolean(c),
    );
    if (candidates.some((c) => normalizeTeamName(c) === normalized)) {
      return team;
    }
  }

  for (const team of teams) {
    const candidates = [team.name, team.shortName].filter(
      (c): c is string => Boolean(c),
    );
    if (
      candidates.some((c) => {
        const candidate = normalizeTeamName(c);
        return (
          candidate.includes(normalized) || normalized.includes(candidate)
        );
      })
    ) {
      return team;
    }
  }

  return null;
}

export async function resolveTeamName(
  csvName: string,
  teams: Team[],
  aliases?: TeamAliasMap,
): Promise<Team | null> {
  const aliasMap = aliases ?? (await loadAliases());
  const lookupName = resolveCsvLookupName(csvName, aliasMap);
  return findTeam(lookupName, teams);
}

export async function resolveAllTeams(
  csvNames: string[],
  teams: Team[],
): Promise<Map<string, Team | null>> {
  const aliases = await loadAliases();
  const results = new Map<string, Team | null>();

  for (const name of csvNames) {
    results.set(name, await resolveTeamName(name, teams, aliases));
  }

  return results;
}
