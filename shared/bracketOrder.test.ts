import { describe, expect, it } from 'vitest';
import {
  BRACKET_FEEDERS,
  buildBracketSlots,
  sortMatchesForBracket,
} from './bracketOrder';

describe('sortMatchesForBracket', () => {
  it('orders Round of 32 so Brazil/Japan and Ivory Coast/Norway feed match 91', () => {
    const ids = sortMatchesForBracket(
      'LAST_32',
      [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88].map((id) => ({
        id,
      })),
    ).map((m) => m.id);

    expect(ids[4]).toBe(76);
    expect(ids[5]).toBe(78);
    expect(BRACKET_FEEDERS[91]).toEqual([76, 78]);
  });

  it('orders Round of 32 so Portugal/Croatia and Spain/Austria feed match 93', () => {
    const ids = sortMatchesForBracket(
      'LAST_32',
      [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88].map((id) => ({
        id,
      })),
    ).map((m) => m.id);

    expect(ids[8]).toBe(83);
    expect(ids[9]).toBe(84);
    expect(BRACKET_FEEDERS[93]).toEqual([83, 84]);
  });

  it('aligns Round of 16 pairs with quarter-final parents', () => {
    const r16Ids = sortMatchesForBracket(
      'LAST_16',
      [89, 90, 91, 92, 93, 94, 95, 96].map((id) => ({ id })),
    ).map((m) => m.id);

    const qfIds = sortMatchesForBracket(
      'QUARTER_FINALS',
      [97, 98, 99, 100].map((id) => ({ id })),
    ).map((m) => m.id);

    for (let slot = 0; slot < 4; slot += 1) {
      const parentId = qfIds[slot];
      const feeders = BRACKET_FEEDERS[parentId];
      expect(feeders).toBeDefined();
      expect(r16Ids[slot * 2]).toBe(feeders![0]);
      expect(r16Ids[slot * 2 + 1]).toBe(feeders![1]);
    }
  });

  it('falls back to id sort for unknown stages', () => {
    const ordered = sortMatchesForBracket('THIRD_PLACE', [{ id: 103 }, { id: 50 }]);
    expect(ordered.map((m) => m.id)).toEqual([50, 103]);
  });
});

describe('buildBracketSlots', () => {
  it('reserves empty slots when later-round fixtures are not published yet', () => {
    const slots = buildBracketSlots('LAST_16', [{ id: 89 }, { id: 90 }, { id: 91 }]);

    expect(slots.map((slot) => slot?.id ?? null)).toEqual([
      89,
      90,
      null,
      null,
      91,
      null,
      null,
      null,
    ]);
  });

  it('fills every slot when the full round is available', () => {
    const slots = buildBracketSlots(
      'LAST_16',
      [89, 90, 91, 92, 93, 94, 95, 96].map((id) => ({ id })),
    );

    expect(slots.every((slot) => slot !== null)).toBe(true);
    expect(slots.map((slot) => slot!.id)).toEqual([89, 90, 93, 94, 91, 92, 95, 96]);
  });
});
