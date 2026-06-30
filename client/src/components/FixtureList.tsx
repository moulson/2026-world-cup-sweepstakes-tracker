import { useMemo } from 'react';
import type { Match, Participant, TeamResult } from '../../../shared/types';
import {
  buildParticipantMatcher,
  getParticipantTeamResult,
  matchInvolvesParticipant,
  teamMatchesMatcher,
} from '../../../shared/matchResult';
import { getFlag } from '../../../shared/flags';
import { getDisplayScore } from '../../../shared/matchScore';
import styles from './FixtureList.module.css';

interface Props {
  matches: Match[];
  selected: Participant | null;
  groupStageOnly?: boolean;
}

function formatStage(stage: string, group?: string | null): string {
  const labels: Record<string, string> = {
    GROUP_STAGE: 'Group Stage',
    LAST_32: 'Round of 32',
    LAST_16: 'Round of 16',
    QUARTER_FINALS: 'Quarter-finals',
    SEMI_FINALS: 'Semi-finals',
    THIRD_PLACE: 'Third place',
    FINAL: 'Final',
  };
  const label = labels[stage] ?? stage.replace(/_/g, ' ');
  return group ? `${label} · ${group.replace('GROUP_', 'Group ')}` : label;
}

function formatStatus(status: string, minute?: number | null): string {
  if (status === 'IN_PLAY' || status === 'PAUSED') {
    return minute != null ? `${minute}'` : 'Live';
  }
  const labels: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    TIMED: 'Upcoming',
    FINISHED: 'FT',
    EXTRA_TIME: 'ET',
    PENALTY_SHOOTOUT: 'Pens',
    POSTPONED: 'Postponed',
    CANCELLED: 'Cancelled',
    SUSPENDED: 'Suspended',
    AWARDED: 'Awarded',
  };
  return labels[status] ?? status;
}

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

export function FixtureList({
  matches,
  selected,
  groupStageOnly = false,
}: Props) {
  const matcher = useMemo(
    () => buildParticipantMatcher(selected),
    [selected],
  );

  const filteredMatches = useMemo(() => {
    if (!groupStageOnly) return matches;
    return matches.filter((match) => match.stage === 'GROUP_STAGE');
  }, [matches, groupStageOnly]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Match[]>();
    for (const match of filteredMatches) {
      const key = formatStage(match.stage, match.group);
      const list = groups.get(key) ?? [];
      list.push(match);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [filteredMatches]);

  if (filteredMatches.length === 0) {
    return <p className={styles.empty}>No fixtures scheduled yet.</p>;
  }

  return (
    <div className={styles.list}>
      {grouped.map(([stage, stageMatches]) => (
        <div key={stage} className={styles.group}>
          <h3 className={styles.groupTitle}>{stage}</h3>
          <div className={styles.fixtures}>
            {stageMatches.map((match) => {
              const involved = selected
                ? matchInvolvesParticipant(match, matcher)
                : false;
              const result = involved
                ? getParticipantTeamResult(match, matcher)
                : 'pending';

              const homeHighlighted =
                involved && teamMatchesMatcher(match.homeTeam, matcher);
              const awayHighlighted =
                involved && teamMatchesMatcher(match.awayTeam, matcher);

              const displayScore = getDisplayScore(match.score);
              const hasScore = displayScore !== null;

              return (
                <div
                  key={match.id}
                  className={`${styles.fixture} ${involved ? resultClass(result) : ''} ${involved ? styles.highlighted : ''}`}
                >
                  <time className={styles.date} dateTime={match.utcDate}>
                    {new Date(match.utcDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>

                  <div className={styles.teams}>
                    <span
                      className={`${styles.team} ${homeHighlighted ? styles.teamHighlighted : ''}`}
                    >
                      <span className={styles.flag}>
                        {getFlag(teamLabel(match.homeTeam.name))}
                      </span>
                      {teamLabel(match.homeTeam.name)}
                    </span>
                    <span className={styles.vs}>
                      {hasScore ? (
                        <strong>
                          {displayScore.home} – {displayScore.away}
                          {displayScore.penaltyNote && (
                            <span className={styles.penNote}>
                              {' '}
                              ({displayScore.penaltyNote})
                            </span>
                          )}
                        </strong>
                      ) : (
                        'vs'
                      )}
                    </span>
                    <span
                      className={`${styles.team} ${awayHighlighted ? styles.teamHighlighted : ''}`}
                    >
                      <span className={styles.flag}>
                        {getFlag(teamLabel(match.awayTeam.name))}
                      </span>
                      {teamLabel(match.awayTeam.name)}
                    </span>
                  </div>

                  <span
                    className={`${styles.badge} ${match.status === 'IN_PLAY' || match.status === 'PAUSED' ? styles.badgeLive : ''}`}
                  >
                    {formatStatus(match.status, match.minute)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
