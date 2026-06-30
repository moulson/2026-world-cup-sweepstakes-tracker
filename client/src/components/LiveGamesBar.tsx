import type { Match } from '../../../shared/types';
import { getDisplayScore, getLiveMatches } from '../../../shared/matchScore';
import { getFlag } from '../../../shared/flags';
import styles from './LiveGamesBar.module.css';

interface Props {
  matches: Match[];
}

function teamLabel(name: string | null): string {
  return name ?? 'TBD';
}

function formatLiveStatus(status: string, minute?: number | null): string {
  if (status === 'IN_PLAY' || status === 'PAUSED') {
    return minute != null ? `${minute}'` : 'Live';
  }
  if (status === 'EXTRA_TIME') return 'ET';
  if (status === 'PENALTY_SHOOTOUT') return 'Pens';
  return 'Live';
}

function LiveGamePill({ match }: { match: Match }) {
  const display = getDisplayScore(match.score);
  const pens = match.score?.penalties;
  const livePens =
    match.status === 'PENALTY_SHOOTOUT' &&
    pens &&
    pens.home !== null &&
    pens.away !== null;

  return (
    <div className={styles.pill} role="listitem">
      <span className={styles.liveDot} aria-hidden />
      <span className={styles.teams}>
        <span className={styles.team}>
          <span className={styles.flag}>{getFlag(teamLabel(match.homeTeam.name))}</span>
          {teamLabel(match.homeTeam.shortName ?? match.homeTeam.name)}
        </span>
        <span className={styles.score}>
          {display ? (
            <>
              {display.home}–{display.away}
              {livePens && (
                <span className={styles.penScore}>
                  {' '}
                  ({pens.home}–{pens.away} pens)
                </span>
              )}
            </>
          ) : (
            'vs'
          )}
        </span>
        <span className={styles.team}>
          <span className={styles.flag}>{getFlag(teamLabel(match.awayTeam.name))}</span>
          {teamLabel(match.awayTeam.shortName ?? match.awayTeam.name)}
        </span>
      </span>
      <span className={styles.status}>{formatLiveStatus(match.status, match.minute)}</span>
    </div>
  );
}

export function LiveGamesBar({ matches }: Props) {
  const liveMatches = getLiveMatches(matches);

  if (liveMatches.length === 0) return null;

  return (
    <section className={styles.bar} aria-label="Live matches">
      <div className={styles.track} role="list">
        {liveMatches.map((match) => (
          <LiveGamePill key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
}
