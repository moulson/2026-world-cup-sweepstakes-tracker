import { describe, expect, it } from 'vitest';

interface PollWindow {
  start: Date;
  end: Date;
  matchIds: number[];
}

function mergeWindows(windows: PollWindow[]): PollWindow[] {
  if (windows.length === 0) return [];

  const sorted = [...windows].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const merged: PollWindow[] = [
    { ...sorted[0], matchIds: [...sorted[0].matchIds] },
  ];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start.getTime() <= last.end.getTime()) {
      last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
      last.matchIds.push(...current.matchIds);
    } else {
      merged.push({ ...current, matchIds: [...current.matchIds] });
    }
  }

  return merged;
}

describe('mergeWindows', () => {
  it('merges overlapping windows', () => {
    const windows: PollWindow[] = [
      {
        start: new Date('2026-06-15T18:00:00Z'),
        end: new Date('2026-06-15T21:00:00Z'),
        matchIds: [1],
      },
      {
        start: new Date('2026-06-15T20:00:00Z'),
        end: new Date('2026-06-15T23:00:00Z'),
        matchIds: [2],
      },
    ];

    const result = mergeWindows(windows);
    expect(result).toHaveLength(1);
    expect(result[0].matchIds).toEqual([1, 2]);
  });

  it('keeps separate non-overlapping windows', () => {
    const windows: PollWindow[] = [
      {
        start: new Date('2026-06-15T18:00:00Z'),
        end: new Date('2026-06-15T20:00:00Z'),
        matchIds: [1],
      },
      {
        start: new Date('2026-06-16T18:00:00Z'),
        end: new Date('2026-06-16T20:00:00Z'),
        matchIds: [2],
      },
    ];

    const result = mergeWindows(windows);
    expect(result).toHaveLength(2);
  });
});
