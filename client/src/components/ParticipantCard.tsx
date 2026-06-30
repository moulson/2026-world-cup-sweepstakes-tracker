import { useState } from 'react';
import type { Participant } from '../../../shared/types';
import {
  isParticipantFullyEliminated,
  isParticipantTeamEliminated,
  type EliminationInfo,
} from '../../../shared/elimination';
import styles from './ParticipantCard.module.css';

interface Props {
  participant: Participant;
  selected: boolean;
  highlighted: boolean;
  elimination: EliminationInfo;
  onSelect: () => void;
}

export function ParticipantCard({
  participant,
  selected,
  highlighted,
  elimination,
  onSelect,
}: Props) {
  const [imgError, setImgError] = useState(false);

  const aliveCount = participant.teams.filter(
    (team) => !isParticipantTeamEliminated(team, elimination),
  ).length;
  const fullyEliminated = isParticipantFullyEliminated(participant, elimination);

  return (
    <button
      type="button"
      className={`${styles.card} ${selected ? styles.selected : ''} ${highlighted ? styles.highlighted : ''} ${fullyEliminated ? styles.fullyEliminated : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className={styles.avatar}>
        <img
          src={imgError ? '/profiles/default.svg' : participant.profileImage}
          alt=""
          onError={() => setImgError(true)}
        />
      </div>
      <div className={styles.info}>
        <h3 className={styles.name}>
          {participant.name}
          <span className={styles.aliveCount}>
            {aliveCount}/{participant.teams.length} left
          </span>
        </h3>
        <ul className={styles.teams}>
          {participant.teams.map((team) => {
            const eliminated = isParticipantTeamEliminated(team, elimination);
            return (
              <li
                key={team.csvName}
                className={eliminated ? styles.eliminated : ''}
              >
                <span className={styles.flag}>{team.flag}</span>
                <span className={team.team ? '' : styles.unmapped}>
                  {team.csvName}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </button>
  );
}
