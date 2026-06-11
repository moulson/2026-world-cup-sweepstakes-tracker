import { useMemo } from 'react';
import type { Match, Participant, TeamResult } from '../../../shared/types';
import {
  buildParticipantMatcher,
  getParticipantTeamResult,
  matchInvolvesParticipant,
  teamMatchesMatcher,
} from '../../../shared/matchResult';
import { getFlag } from '../../../shared/flags';
import styles from './BracketView.module.css';

interface Props {
  matches: Match[];
  selected: Participant | null;
}

const KNOCKOUT_STAGES = [
  { stage: 'LAST_32', label: 'Round of 32', slots: 16 },
  { stage: 'LAST_16', label: 'Round of 16', slots: 8 },
  { stage: 'QUARTER_FINALS', label: 'Quarter-finals', slots: 4 },
  { stage: 'SEMI_FINALS', label: 'Semi-finals', slots: 2 },
] as const;

const FINAL_STAGES = [
  { stage: 'THIRD_PLACE', label: 'Third place' },
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

function BracketMatch({
  match,
  matcher,
  selected,
}: {
  match: Match;
  matcher: ReturnType<typeof buildParticipantMatcher>;
  selected: Participant | null;
}) {
  const involved = selected ? matchInvolvesParticipant(match, matcher) : false;
  const result = involved ? getParticipantTeamResult(match, matcher) : 'pending';
  const homeHighlighted =
    involved && teamMatchesMatcher(match.homeTeam, matcher);
  const awayHighlighted =
    involved && teamMatchesMatcher(match.awayTeam, matcher);

  const homeScore = match.score.fullTime.home;
  const awayScore = match.score.fullTime.away;
  const hasScore = homeScore !== null && awayScore !== null;

  return (
    <div
      className={`${styles.match} ${involved ? resultClass(result) : ''} ${involved ? styles.highlighted : ''}`}
    >
      <div
        className={`${styles.teamRow} ${homeHighlighted ? styles.teamHighlighted : ''}`}
      >
        <span className={styles.flag}>
          {getFlag(teamLabel(match.homeTeam.name))}
        </span>
        <span className={styles.teamName}>{teamLabel(match.homeTeam.name)}</span>
        {hasScore && <span className={styles.score}>{homeScore}</span>}
      </div>
      <div
        className={`${styles.teamRow} ${awayHighlighted ? styles.teamHighlighted : ''}`}
      >
        <span className={styles.flag}>
          {getFlag(teamLabel(match.awayTeam.name))}
        </span>
        <span className={styles.teamName}>{teamLabel(match.awayTeam.name)}</span>
        {hasScore && <span className={styles.score}>{awayScore}</span>}
      </div>
      <div className={styles.matchMeta}>
        <time dateTime={match.utcDate}>
          {new Date(match.utcDate).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </time>
        <span
          className={`${styles.status} ${match.status === 'IN_PLAY' || match.status === 'PAUSED' ? styles.statusLive : ''}`}
        >
          {formatStatus(match.status)}
        </span>
      </div>
    </div>
  );
}

function RoundColumn({
  label,
  matches,
  slots,
  roundIndex,
  matcher,
  selected,
}: {
  label: string;
  matches: Match[];
  slots: number;
  roundIndex: number;
  matcher: ReturnType<typeof buildParticipantMatcher>;
  selected: Participant | null;
}) {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(),
  );

  const placeholders = Math.max(0, slots - sorted.length);

  const roundClass = [styles.round, styles[`round${roundIndex}` as keyof typeof styles]]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={roundClass}>
      <h3 className={styles.roundTitle}>{label}</h3>
      <div className={styles.roundMatches}>
        {sorted.map((match) => (
          <BracketMatch
            key={match.id}
            match={match}
            matcher={matcher}
            selected={selected}
          />
        ))}
        {Array.from({ length: placeholders }, (_, index) => (
          <div key={`tbd-${label}-${index}`} className={styles.matchTbd}>
            <div className={styles.teamRow}>
              <span className={styles.teamName}>TBD</span>
            </div>
            <div className={styles.teamRow}>
              <span className={styles.teamName}>TBD</span>
            </div>
            <div className={styles.matchMeta}>
              <span className={styles.status}>Winner advances</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BracketView({ matches, selected }: Props) {
  const matcher = useMemo(
    () => buildParticipantMatcher(selected),
    [selected],
  );

  const knockoutMatches = useMemo(
    () => matches.filter((match) => match.stage !== 'GROUP_STAGE'),
    [matches],
  );

  const byStage = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const match of knockoutMatches) {
      const list = map.get(match.stage) ?? [];
      list.push(match);
      map.set(match.stage, list);
    }
    return map;
  }, [knockoutMatches]);

  if (knockoutMatches.length === 0) {
    return (
      <p className={styles.empty}>
        Knockout fixtures will appear here once the bracket is published.
      </p>
    );
  }

  return (
    <div className={styles.bracketScroll}>
      <div className={styles.bracket}>
        {KNOCKOUT_STAGES.map((round, index) => (
          <RoundColumn
            key={round.stage}
            label={round.label}
            matches={byStage.get(round.stage) ?? []}
            slots={round.slots}
            roundIndex={index}
            matcher={matcher}
            selected={selected}
          />
        ))}
        <div className={styles.finalColumn}>
          {FINAL_STAGES.map((round) => {
            const roundMatches = byStage.get(round.stage) ?? [];
            return (
              <div key={round.stage} className={styles.finalRound}>
                <h3 className={styles.roundTitle}>{round.label}</h3>
                <div className={styles.roundMatches}>
                  {roundMatches.length > 0 ? (
                    roundMatches.map((match) => (
                      <BracketMatch
                        key={match.id}
                        match={match}
                        matcher={matcher}
                        selected={selected}
                      />
                    ))
                  ) : (
                    <div className={styles.matchTbd}>
                      <div className={styles.teamRow}>
                        <span className={styles.teamName}>TBD</span>
                      </div>
                      <div className={styles.teamRow}>
                        <span className={styles.teamName}>TBD</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
