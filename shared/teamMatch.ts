import teamAliases from '../data/team-aliases.json' with { type: 'json' };
import type { Match, Participant, Team } from './types.js';

export type TeamAliasMap = Record<string, string>;

export function normalizeTeamName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface ParticipantMatcher {
  teamIds: Set<number>;
  normalizedNames: Set<string>;
}

const EMPTY_MATCHER: ParticipantMatcher = {
  teamIds: new Set(),
  normalizedNames: new Set(),
};

function addNormalizedName(
  names: Set<string>,
  value: string | null | undefined,
): void {
  if (!value) return;
  const normalized = normalizeTeamName(value);
  if (normalized) names.add(normalized);
}

function addTeamNames(names: Set<string>, team: Team): void {
  addNormalizedName(names, team.name);
  addNormalizedName(names, team.shortName);
  addNormalizedName(names, team.tla);
}

export function resolveCsvLookupName(
  csvName: string,
  aliases: TeamAliasMap = teamAliases,
): string {
  return aliases[csvName.trim()] ?? csvName.trim();
}

export function buildParticipantMatcher(
  participant: Participant | null,
  aliases: TeamAliasMap = teamAliases,
): ParticipantMatcher {
  if (!participant) return EMPTY_MATCHER;

  const teamIds = new Set<number>();
  const normalizedNames = new Set<string>();

  for (const entry of participant.teams) {
    const csvName = entry.csvName.trim();
    addNormalizedName(normalizedNames, csvName);
    addNormalizedName(normalizedNames, resolveCsvLookupName(csvName, aliases));

    if (entry.team?.id != null) {
      teamIds.add(entry.team.id);
      addTeamNames(normalizedNames, entry.team);
    }
  }

  return { teamIds, normalizedNames };
}

export function teamMatchesMatcher(
  team: Team,
  matcher: ParticipantMatcher,
): boolean {
  if (team.id != null && matcher.teamIds.has(team.id)) {
    return true;
  }

  const candidates = [team.name, team.shortName, team.tla].filter(
    (value): value is string => Boolean(value),
  );

  for (const candidate of candidates) {
    const normalized = normalizeTeamName(candidate);
    if (matcher.normalizedNames.has(normalized)) {
      return true;
    }

    for (const known of matcher.normalizedNames) {
      if (
        normalized.includes(known) ||
        known.includes(normalized)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Builds a reusable finder that resolves the owning participant of a team.
 * Matchers are built once for all participants, so the returned function is
 * cheap to call repeatedly. Returns the first matching participant, or null.
 */
export function buildOwnerFinder(
  participants: Participant[],
  aliases: TeamAliasMap = teamAliases,
): (team: Team) => Participant | null {
  const entries = participants.map((participant) => ({
    participant,
    matcher: buildParticipantMatcher(participant, aliases),
  }));

  return (team: Team) => {
    if (team.id == null && !team.name) return null;
    for (const entry of entries) {
      if (teamMatchesMatcher(team, entry.matcher)) return entry.participant;
    }
    return null;
  };
}

export function matchInvolvesParticipant(
  match: Match,
  matcher: ParticipantMatcher,
): boolean {
  return (
    teamMatchesMatcher(match.homeTeam, matcher) ||
    teamMatchesMatcher(match.awayTeam, matcher)
  );
}

export function participantSideInMatch(
  match: Match,
  matcher: ParticipantMatcher,
): 'home' | 'away' | null {
  if (teamMatchesMatcher(match.homeTeam, matcher)) return 'home';
  if (teamMatchesMatcher(match.awayTeam, matcher)) return 'away';
  return null;
}
