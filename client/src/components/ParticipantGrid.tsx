import type { Participant } from '../../../shared/types';
import { ParticipantCard } from './ParticipantCard';
import styles from './ParticipantGrid.module.css';

interface Props {
  participants: Participant[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}

export function ParticipantGrid({ participants, selectedSlug, onSelect }: Props) {
  return (
    <div className={styles.grid}>
      {participants.map((participant) => (
        <ParticipantCard
          key={participant.slug}
          participant={participant}
          selected={participant.slug === selectedSlug}
          onSelect={() => onSelect(participant.slug)}
        />
      ))}
    </div>
  );
}
