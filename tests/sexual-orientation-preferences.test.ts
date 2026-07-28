import { describe, expect, it } from 'vitest'
import {
  expandSexualOrientationPreferences,
  groupSexualOrientationPreferences,
  sexualOrientationPreferenceOptions,
} from '../utils/sexualOrientation'

describe('sexual orientation preference groups', () => {
  it('offers three broad matching choices', () => {
    expect(sexualOrientationPreferenceOptions.map(option => option.label))
      .toEqual(['Heterosexual', 'Homosexual', 'Other'])
  })

  it('expands broad choices into the specific stored profile orientations', () => {
    expect(expandSexualOrientationPreferences(['heterosexual'])).toEqual(['straight'])
    expect(expandSexualOrientationPreferences(['homosexual'])).toEqual(['gay', 'lesbian'])
    expect(expandSexualOrientationPreferences(['other'])).toEqual([
      'bisexual', 'pansexual', 'asexual', 'queer', 'questioning', 'prefer_not_to_say',
    ])
  })

  it('groups existing detailed preferences for the simplified UI', () => {
    expect(groupSexualOrientationPreferences(['straight', 'bisexual', 'queer']))
      .toEqual(['heterosexual', 'other'])
  })
})
