import type { Participant } from '../../../shared/types';
import type { EliminationInfo } from '../../../shared/elimination';
import { ParticipantCard } from './ParticipantCard';
import styles from './ParticipantGrid.module.css';

interface Props {
  participants: Participant[];
  selectedSlug: string | null;
  highlightedSlugs: string[];
  elimination: EliminationInfo;
  onSelect: (slug: string) => void;
}

export function ParticipantGrid({
  participants,
  selectedSlug,
  highlightedSlugs,
  elimination,
  onSelect,
}: Props) {
  return (
    <div className={styles.grid}>
      {participants.map((participant) => (
        <ParticipantCard
          key={participant.slug}
          participant={participant}
          selected={participant.slug === selectedSlug}
          highlighted={highlightedSlugs.includes(participant.slug)}
          elimination={elimination}
          onSelect={() => onSelect(participant.slug)}
        />
      ))}
    </div>
  );
}
