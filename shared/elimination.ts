import type { Match, ParticipantTeam, Team } from './types.js';
import {
  normalizeTeamName,
  resolveCsvLookupName,
  type TeamAliasMap,
} from './teamMatch.js';

const FINISHED_STATUSES = new Set(['FINISHED', 'AWARDED']);

export interface EliminationInfo {
  teamIds: Set<number>;
  normalizedNames: Set<string>;
}

function collectTeamKeys(
  team: Team,
  ids: Set<number>,
  names: Set<string>,
): void {
  if (team.id != null) ids.add(team.id);
  for (const value of [team.name, team.shortName, team.tla]) {
    if (value) {
      const normalized = normalizeTeamName(value);
      if (normalized) names.add(normalized);
    }
  }
}

function isRealTeam(team: Team): boolean {
  return team.id != null || Boolean(team.name);
}

/**
 * Determines which teams are out of the tournament so the UI can dim them.
 *
 * A team is considered eliminated when either:
 *  - it lost a finished knockout tie (regular result, or decided on penalties
 *    where the full-time score is level but `score.winner` names the other side), or
 *  - the group stage is complete and the team did not make it into the
 *    knockout bracket (a group-stage exit).
 *
 * The group-stage rule only fires once every group match is finished AND the
 * knockout draw has real teams, to avoid wrongly dimming teams while ties are
 * still showing as TBD.
 */
export function computeEliminatedTeams(matches: Match[]): EliminationInfo {
  const teamIds = new Set<number>();
  const normalizedNames = new Set<string>();

  const groupMatches = matches.filter((m) => m.stage === 'GROUP_STAGE');
  const knockoutMatches = matches.filter((m) => m.stage !== 'GROUP_STAGE');

  for (const match of knockoutMatches) {
    if (!FINISHED_STATUSES.has(match.status)) continue;
    const home = match.score.fullTime.home;
    const away = match.score.fullTime.away;
    if (home === null || away === null) continue;

    let loser: Team | null = null;
    if (home > away) loser = match.awayTeam;
    else if (away > home) loser = match.homeTeam;
    else if (match.score.winner === 'HOME_TEAM') loser = match.awayTeam;
    else if (match.score.winner === 'AWAY_TEAM') loser = match.homeTeam;

    if (loser && isRealTeam(loser)) {
      collectTeamKeys(loser, teamIds, normalizedNames);
    }
  }

  const groupStageComplete =
    groupMatches.length > 0 &&
    groupMatches.every((m) => FINISHED_STATUSES.has(m.status));

  const knockoutIds = new Set<number>();
  const knockoutNames = new Set<string>();
  for (const match of knockoutMatches) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (isRealTeam(team)) collectTeamKeys(team, knockoutIds, knockoutNames);
    }
  }

  if (groupStageComplete && (knockoutIds.size > 0 || knockoutNames.size > 0)) {
    for (const match of groupMatches) {
      for (const team of [match.homeTeam, match.awayTeam]) {
        if (!isRealTeam(team)) continue;
        const advanced =
          (team.id != null && knockoutIds.has(team.id)) ||
          [team.name, team.shortName, team.tla].some(
            (value) =>
              value != null && knockoutNames.has(normalizeTeamName(value)),
          );
        if (!advanced) collectTeamKeys(team, teamIds, normalizedNames);
      }
    }
  }

  return { teamIds, normalizedNames };
}

/**
 * Checks whether a participant's team entry refers to an eliminated nation.
 * Matches on the resolved API team id first, then falls back to the CSV name
 * (and its alias) plus any resolved team names, mirroring the matcher logic.
 */
export function isParticipantTeamEliminated(
  entry: ParticipantTeam,
  elimination: EliminationInfo,
  aliases?: TeamAliasMap,
): boolean {
  if (entry.team?.id != null && elimination.teamIds.has(entry.team.id)) {
    return true;
  }

  const candidates: string[] = [entry.csvName, resolveCsvLookupName(entry.csvName, aliases)];
  if (entry.team) {
    candidates.push(
      ...[entry.team.name, entry.team.shortName, entry.team.tla].filter(
        (value): value is string => Boolean(value),
      ),
    );
  }

  for (const candidate of candidates) {
    const normalized = normalizeTeamName(candidate);
    if (normalized && elimination.normalizedNames.has(normalized)) {
      return true;
    }
  }

  return false;
}
