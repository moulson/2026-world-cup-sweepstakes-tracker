import {
  buildOwnerFinder,
  buildParticipantMatcher,
  matchInvolvesParticipant,
  participantSideInMatch,
  teamMatchesMatcher,
  type ParticipantMatcher,
} from './teamMatch.js';
import type { Match, TeamResult } from './types.js';

const FINISHED_STATUSES = new Set(['FINISHED', 'AWARDED']);

export function teamResult(teamId: number, match: Match): TeamResult {
  if (!FINISHED_STATUSES.has(match.status)) return 'pending';

  const home = match.score.fullTime.home;
  const away = match.score.fullTime.away;
  if (home === null || away === null) return 'pending';

  const isHome = match.homeTeam.id === teamId;
  if (home === away) return 'draw';

  const won = isHome ? home > away : away > home;
  return won ? 'win' : 'loss';
}

/** @deprecated Use matchInvolvesParticipant with ParticipantMatcher */
export function matchInvolvesTeam(match: Match, teamIds: Set<number>): boolean {
  return (
    (match.homeTeam.id != null && teamIds.has(match.homeTeam.id)) ||
    (match.awayTeam.id != null && teamIds.has(match.awayTeam.id))
  );
}

export function getParticipantTeamResult(
  match: Match,
  matcher: ParticipantMatcher,
): TeamResult {
  const side = participantSideInMatch(match, matcher);
  if (!side) return 'pending';

  if (!FINISHED_STATUSES.has(match.status)) return 'pending';

  const home = match.score.fullTime.home;
  const away = match.score.fullTime.away;
  if (home === null || away === null) return 'pending';

  if (home === away) return 'draw';

  const won = side === 'home' ? home > away : away > home;
  return won ? 'win' : 'loss';
}

export {
  buildOwnerFinder,
  buildParticipantMatcher,
  matchInvolvesParticipant,
  teamMatchesMatcher,
  type ParticipantMatcher,
};
