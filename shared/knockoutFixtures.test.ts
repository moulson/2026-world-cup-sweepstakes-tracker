import { describe, expect, it } from 'vitest';
import { KNOCKOUT_FIXTURE_KICKOFFS, resolveKnockoutFixture } from './knockoutFixtures';

describe('KNOCKOUT_FIXTURE_KICKOFFS', () => {
  it('defines all 32 knockout fixtures', () => {
    const fixtures = Object.keys(KNOCKOUT_FIXTURE_KICKOFFS).map(Number);
    expect(fixtures).toHaveLength(32);
    expect(Math.min(...fixtures)).toBe(73);
    expect(Math.max(...fixtures)).toBe(104);
  });
});

describe('resolveKnockoutFixture kickoff collisions', () => {
  it('distinguishes same-day ties within a round', () => {
    const match89 = {
      id: 1,
      stage: 'LAST_16',
      utcDate: KNOCKOUT_FIXTURE_KICKOFFS[89],
      matchday: null,
    };
    const match90 = {
      id: 2,
      stage: 'LAST_16',
      utcDate: KNOCKOUT_FIXTURE_KICKOFFS[90],
      matchday: null,
    };

    expect(resolveKnockoutFixture(match89)).toBe(89);
    expect(resolveKnockoutFixture(match90)).toBe(90);
  });
});
