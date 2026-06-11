import fs from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { getFlag } from '../shared/flags.js';
import type { Participant, ParticipantTeam, Team } from '../shared/types.js';
import { DRAW_CSV } from './paths.js';
import { resolveTeamName } from './teamResolver.js';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface DrawRow {
  Name: string;
  'Nation 1': string;
  'Nation 2': string;
  'Nation 3': string;
  'Nation 4': string;
}

export async function loadParticipants(teams: Team[]): Promise<Participant[]> {
  const raw = await fs.readFile(DRAW_CSV, 'utf-8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true }) as DrawRow[];

  const participants: Participant[] = [];

  for (const row of rows) {
    const nationNames = [
      row['Nation 1'],
      row['Nation 2'],
      row['Nation 3'],
      row['Nation 4'],
    ];

    const participantTeams: ParticipantTeam[] = [];

    for (const rawName of nationNames) {
      const csvName = rawName.trim();
      const team = await resolveTeamName(csvName, teams);
      participantTeams.push({
        csvName,
        team,
        flag: getFlag(csvName),
      });
    }

    const slug = slugify(row.Name);
    participants.push({
      name: row.Name,
      slug,
      profileImage: `/profiles/${slug}.jpg`,
      teams: participantTeams,
    });
  }

  return participants;
}
