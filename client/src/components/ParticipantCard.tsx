import { useState } from 'react';
import type { Participant } from '../../../shared/types';
import styles from './ParticipantCard.module.css';

interface Props {
  participant: Participant;
  selected: boolean;
  onSelect: () => void;
}

export function ParticipantCard({ participant, selected, onSelect }: Props) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      className={`${styles.card} ${selected ? styles.selected : ''}`}
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
        <h3 className={styles.name}>{participant.name}</h3>
        <ul className={styles.teams}>
          {participant.teams.map((team) => (
            <li key={team.csvName}>
              <span className={styles.flag}>{team.flag}</span>
              <span className={team.team ? '' : styles.unmapped}>
                {team.csvName}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}
