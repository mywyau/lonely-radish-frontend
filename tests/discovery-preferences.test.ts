import { describe, expect, it } from 'vitest'
import { normalizeDiscoveryPreferences } from '../server/utils/discoveryPreferences'

describe('discovery preference summaries', () => {
  it('provides safe defaults when a profile has no match-preference row', () => {
    expect(normalizeDiscoveryPreferences(null)).toMatchObject({
      minimumAge: 18,
      maximumAge: 100,
      distance: 10,
      openToEveryone: true,
      genders: [],
      noOrientationPreference: true,
      orientations: [],
      noRacePreference: true,
    })
  })

  it('normalizes nullable preference arrays before discovery formats them', () => {
    expect(normalizeDiscoveryPreferences({
      openToEveryone: false,
      genders: null,
      noOrientationPreference: false,
      orientations: null,
    })).toMatchObject({
      openToEveryone: false,
      genders: [],
      noOrientationPreference: false,
      orientations: [],
    })
  })
})
