import { describe, expect, it } from 'vitest';
import { missingPreferences, normalizeDietary } from './preferences';

describe('participant preference validation', () => {
  it('normalizes no-restriction dietary answers', () => {
    expect(normalizeDietary(['NA', 'n/a', ' none ', 'No restrictions', 'Vegetarian options', 'Vegetarian options'])).toEqual(['Vegetarian options']);
  });

  it('explains when a typed location was not selected', () => {
    expect(missingPreferences({ name: 'Akshit', placeId: null, dates: ['2026-09-12'], windows: ['evening'], activities: ['anything'] }))
      .toEqual(['Select your starting location from the suggestions.']);
  });
});
