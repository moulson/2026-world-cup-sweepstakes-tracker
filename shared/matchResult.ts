import {
  buildOwnerFinder,
  buildParticipantMatcher,
  matchInvolvesParticipant,
  participantSideInMatch,
  teamMatchesMatcher,
  type ParticipantMatcher,
} from './teamMatch.js';
import { readFullTime } from './matchScore.js';
import type { Match, TeamResult } from './types.js';

const FINISHED_STATUSES = new Set(['FINISHED', 'AWARDED']);

function resultFromScores(
  side: 'home' | 'away',
  home: number,
  away: number,
  winner: Match['score']['winner'],
): TeamResult {
  if (home === away) {
    if (winner === 'HOME_TEAM') return side === 'home' ? 'win' : 'loss';
    if (winner === 'AWAY_TEAM') return side === 'away' ? 'win' : 'loss';
    return 'draw';
  }

  const won = side === 'home' ? home > away : away > home;
  return won ? 'win' : 'loss';
}

export function teamResult(teamId: number, match: Match): TeamResult {
  if (!FINISHED_STATUSES.has(match.status)) return 'pending';

  const { home, away } = readFullTime(match.score);
  if (home === null || away === null) return 'pending';

  const isHome = match.homeTeam.id === teamId;
  const side = isHome ? 'home' : 'away';
  return resultFromScores(side, home, away, match.score.winner);
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

  const { home, away } = readFullTime(match.score);
  if (home === null || away === null) return 'pending';

  return resultFromScores(side, home, away, match.score.winner);
}

export {
  buildOwnerFinder,
  buildParticipantMatcher,
  matchInvolvesParticipant,
  teamMatchesMatcher,
  type ParticipantMatcher,
};
