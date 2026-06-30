import { useMemo, type KeyboardEvent } from 'react';
import type { Match, Participant, Team, TeamResult } from '../../../shared/types';
import {
  buildOwnerFinder,
  buildParticipantMatcher,
  getParticipantTeamResult,
  matchInvolvesParticipant,
  teamMatchesMatcher,
} from '../../../shared/matchResult';
import { getFlag } from '../../../shared/flags';
import { getKnockoutMatchLoser, isSameTeam } from '../../../shared/elimination';
import { getDisplayScore } from '../../../shared/matchScore';
import styles from './BracketView.module.css';

type FindOwner = (team: Team) => Participant | null;
type Matcher = ReturnType<typeof buildParticipantMatcher>;

interface Props {
  matches: Match[];
  selected: Participant | null;
  participants: Participant[];
  nextMatchId: number | null;
  selectedFixtureId: number | null;
  onFixtureSelect: (fixtureId: number, participantSlugs: string[]) => void;
}

type FixtureSelectHandler = (fixtureId: number, participantSlugs: string[]) => void;

/**
 * Rounds are laid out left-to-right as a binary tree. Within a round, matches
 * are ordered by their football-data id, which mirrors the official bracket
 * order top-to-bottom: consecutive pairs feed the next round's match, so e.g.
 * the first two Round of 32 ties feed the first Round of 16 tie.
 */
const ROUNDS = [
  { stage: 'LAST_32', label: 'Round of 32' },
  { stage: 'LAST_16', label: 'Round of 16' },
  { stage: 'QUARTER_FINALS', label: 'Quarter-finals' },
  { stage: 'SEMI_FINALS', label: 'Semi-finals' },
  { stage: 'FINAL', label: 'Final' },
] as const;

function resultClass(result: TeamResult): string {
  switch (result) {
    case 'win':
      return styles.win;
    case 'loss':
      return styles.loss;
    case 'draw':
      return styles.draw;
    default:
      return styles.pending;
  }
}

function teamLabel(name: string | null): string {
  return name ?? 'TBD';
}

function formatStatus(status: string): string {
  if (status === 'IN_PLAY' || status === 'PAUSED') return 'Live';
  if (status === 'FINISHED' || status === 'AWARDED') return 'FT';
  if (status === 'TIMED' || status === 'SCHEDULED') return 'Upcoming';
  return status.replace(/_/g, ' ');
}

function formatKickoff(utcDate: string): string {
  return new Date(utcDate).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sortById(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.id - b.id);
}

function BracketMatch({
  match,
  matcher,
  selected,
  findOwner,
  isNext,
  isSelected,
  onFixtureSelect,
}: {
  match: Match;
  matcher: Matcher;
  selected: Participant | null;
  findOwner: FindOwner;
  isNext: boolean;
  isSelected: boolean;
  onFixtureSelect: FixtureSelectHandler;
}) {
  const involved = selected ? matchInvolvesParticipant(match, matcher) : false;
  const result = involved ? getParticipantTeamResult(match, matcher) : 'pending';
  const homeHighlighted = involved && teamMatchesMatcher(match.homeTeam, matcher);
  const awayHighlighted = involved && teamMatchesMatcher(match.awayTeam, matcher);

  const displayScore = getDisplayScore(match.score);
  const hasScore = displayScore !== null;
  const loser = getKnockoutMatchLoser(match);
  const homeLost = loser !== null && isSameTeam(match.homeTeam, loser);
  const awayLost = loser !== null && isSameTeam(match.awayTeam, loser);

  const homeOwner = findOwner(match.homeTeam);
  const awayOwner = findOwner(match.awayTeam);

  const ownerSlugs = useMemo(
    () =>
      Array.from(
        new Set(
          [homeOwner?.slug, awayOwner?.slug].filter(
            (slug): slug is string => Boolean(slug),
          ),
        ),
      ),
    [homeOwner?.slug, awayOwner?.slug],
  );

  const interactive = ownerSlugs.length > 0;

  const handleSelect = () => {
    if (interactive) onFixtureSelect(match.id, ownerSlugs);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onFixtureSelect(match.id, ownerSlugs);
    }
  };

  return (
    <div
      className={`${styles.match} ${involved ? resultClass(result) : ''} ${involved ? styles.highlighted : ''} ${isSelected ? styles.selectedFixture : ''} ${isNext ? styles.next : ''} ${interactive ? styles.clickable : ''}`}
      onClick={interactive ? handleSelect : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? isSelected : undefined}
    >
      {isNext && <span className={styles.nextBadge}>Next up</span>}
      <div
        className={`${styles.teamRow} ${homeHighlighted ? styles.teamHighlighted : ''} ${homeLost ? styles.teamLost : ''}`}
      >
        <span className={styles.flag}>{getFlag(teamLabel(match.homeTeam.name))}</span>
        <span className={styles.teamName}>{teamLabel(match.homeTeam.name)}</span>
        {homeOwner && <span className={styles.participantName}>{homeOwner.name}</span>}
        {hasScore && <span className={styles.score}>{displayScore.home}</span>}
      </div>
      <div
        className={`${styles.teamRow} ${awayHighlighted ? styles.teamHighlighted : ''} ${awayLost ? styles.teamLost : ''}`}
      >
        <span className={styles.flag}>{getFlag(teamLabel(match.awayTeam.name))}</span>
        <span className={styles.teamName}>{teamLabel(match.awayTeam.name)}</span>
        {awayOwner && <span className={styles.participantName}>{awayOwner.name}</span>}
        {hasScore && <span className={styles.score}>{displayScore.away}</span>}
      </div>
      <div className={styles.matchMeta}>
        <time dateTime={match.utcDate}>{formatKickoff(match.utcDate)}</time>
        {displayScore?.penaltyNote && (
          <span className={styles.penNote}>{displayScore.penaltyNote}</span>
        )}
        <span
          className={`${styles.status} ${match.status === 'IN_PLAY' || match.status === 'PAUSED' ? styles.statusLive : ''}`}
        >
          {formatStatus(match.status)}
        </span>
      </div>
    </div>
  );
}

function MatchSlot(props: {
  match: Match;
  matcher: Matcher;
  selected: Participant | null;
  findOwner: FindOwner;
  nextMatchId: number | null;
  selectedFixtureId: number | null;
  onFixtureSelect: FixtureSelectHandler;
}) {
  return (
    <div className={styles.matchSlot}>
      <BracketMatch
        match={props.match}
        matcher={props.matcher}
        selected={props.selected}
        findOwner={props.findOwner}
        isNext={props.match.id === props.nextMatchId}
        isSelected={props.match.id === props.selectedFixtureId}
        onFixtureSelect={props.onFixtureSelect}
      />
    </div>
  );
}

function RoundColumn({
  label,
  matches,
  hasNext,
  matcher,
  selected,
  findOwner,
  nextMatchId,
  selectedFixtureId,
  onFixtureSelect,
}: {
  label: string;
  matches: Match[];
  hasNext: boolean;
  matcher: Matcher;
  selected: Participant | null;
  findOwner: FindOwner;
  nextMatchId: number | null;
  selectedFixtureId: number | null;
  onFixtureSelect: FixtureSelectHandler;
}) {
  return (
    <div className={`${styles.round} ${hasNext ? styles.withConnectors : ''}`}>
      <h3 className={styles.roundTitle}>{label}</h3>
      <div className={styles.roundBody}>
        {matches.map((match) => (
          <MatchSlot
            key={match.id}
            match={match}
            matcher={matcher}
            selected={selected}
            findOwner={findOwner}
            nextMatchId={nextMatchId}
            selectedFixtureId={selectedFixtureId}
            onFixtureSelect={onFixtureSelect}
          />
        ))}
      </div>
    </div>
  );
}

export function BracketView({
  matches,
  selected,
  participants,
  nextMatchId,
  selectedFixtureId,
  onFixtureSelect,
}: Props) {
  const matcher = useMemo(() => buildParticipantMatcher(selected), [selected]);
  const findOwner = useMemo<FindOwner>(
    () => buildOwnerFinder(participants),
    [participants],
  );

  const byStage = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const match of matches) {
      if (match.stage === 'GROUP_STAGE') continue;
      const list = map.get(match.stage) ?? [];
      list.push(match);
      map.set(match.stage, list);
    }
    for (const [stage, list] of map) map.set(stage, sortById(list));
    return map;
  }, [matches]);

  const thirdPlace = byStage.get('THIRD_PLACE')?.[0] ?? null;
  const hasKnockout = ROUNDS.some((r) => (byStage.get(r.stage)?.length ?? 0) > 0);

  if (!hasKnockout) {
    return (
      <p className={styles.empty}>
        Knockout fixtures will appear here once the bracket is published.
      </p>
    );
  }

  return (
    <div className={styles.bracketScroll}>
      <div className={styles.bracket}>
        {ROUNDS.map((round, index) => (
          <RoundColumn
            key={round.stage}
            label={round.label}
            matches={byStage.get(round.stage) ?? []}
            hasNext={index < ROUNDS.length - 1}
            matcher={matcher}
            selected={selected}
            findOwner={findOwner}
            nextMatchId={nextMatchId}
            selectedFixtureId={selectedFixtureId}
            onFixtureSelect={onFixtureSelect}
          />
        ))}
      </div>

      {thirdPlace && (
        <div className={styles.thirdPlace}>
          <h3 className={styles.roundTitle}>Third place play-off</h3>
          <div className={styles.thirdPlaceCard}>
            <BracketMatch
              match={thirdPlace}
              matcher={matcher}
              selected={selected}
              findOwner={findOwner}
              isNext={thirdPlace.id === nextMatchId}
              isSelected={thirdPlace.id === selectedFixtureId}
              onFixtureSelect={onFixtureSelect}
            />
          </div>
        </div>
      )}
    </div>
  );
}
