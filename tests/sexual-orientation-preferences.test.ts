import { describe, expect, it } from 'vitest'
import {
  expandSexualOrientationPreferences,
  groupSexualOrientationPreferences,
  sexualOrientationPreferenceOptions,
} from '../utils/sexualOrientation'

describe('sexual orientation settings', () => {
  it('uses the same five choices for identity and matching', () => {
    expect(sexualOrientationPreferenceOptions.map(option => option.label))
      .toEqual(['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Another orientation'])
  })

  it('stores selected filters directly without broad-group translation', () => {
    expect(expandSexualOrientationPreferences(['straight', 'gay', 'another_orientation']))
      .toEqual(['straight', 'gay', 'another_orientation'])
    expect(expandSexualOrientationPreferences(['heterosexual', 'other'])).toEqual([])
  })

  it('returns only supported stored preferences to the UI', () => {
    expect(groupSexualOrientationPreferences(['straight', 'bisexual', 'queer']))
      .toEqual(['straight', 'bisexual'])
  })
})
