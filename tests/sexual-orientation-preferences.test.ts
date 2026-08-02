import { describe, expect, it } from 'vitest'
import {
  expandSexualOrientationPreferences,
  groupSexualOrientationPreferences,
  sexualOrientationPreferenceOptions,
} from '../utils/sexualOrientation'

describe('sexual orientation settings', () => {
  it('keeps identity labels distinct while grouping gay and lesbian for matching', () => {
    expect(sexualOrientationPreferenceOptions.map(option => option.label))
      .toEqual(['Heterosexual', 'Homosexual', 'Bisexual', 'Another orientation'])
  })

  it('expands the combined matching preference into both stored identities', () => {
    expect(expandSexualOrientationPreferences(['straight', 'gay_or_lesbian', 'another_orientation']))
      .toEqual(['straight', 'gay', 'lesbian', 'another_orientation'])
    expect(expandSexualOrientationPreferences(['heterosexual', 'other'])).toEqual([])
  })

  it('returns one combined choice for existing gay or lesbian filters', () => {
    expect(groupSexualOrientationPreferences(['straight', 'lesbian', 'bisexual', 'queer']))
      .toEqual(['straight', 'gay_or_lesbian', 'bisexual'])
  })
})
