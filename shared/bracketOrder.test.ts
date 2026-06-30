import { describe, expect, it } from 'vitest';
import { BRACKET_FEEDERS, sortMatchesForBracket } from './bracketOrder';

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

  it('aligns every Round of 32 pair with its Round of 16 parent', () => {
    const r32Ids = sortMatchesForBracket(
      'LAST_32',
      [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88].map((id) => ({
        id,
      })),
    ).map((m) => m.id);

    const r16Ids = sortMatchesForBracket(
      'LAST_16',
      [89, 90, 91, 92, 93, 94, 95, 96].map((id) => ({ id })),
    ).map((m) => m.id);

    for (let slot = 0; slot < 8; slot += 1) {
      const parentId = r16Ids[slot];
      const feeders = BRACKET_FEEDERS[parentId];
      expect(feeders).toBeDefined();
      expect(r32Ids[slot * 2]).toBe(feeders![0]);
      expect(r32Ids[slot * 2 + 1]).toBe(feeders![1]);
    }
  });

  it('falls back to id sort for unknown stages', () => {
    const ordered = sortMatchesForBracket('THIRD_PLACE', [{ id: 103 }, { id: 50 }]);
    expect(ordered.map((m) => m.id)).toEqual([50, 103]);
  });
});
