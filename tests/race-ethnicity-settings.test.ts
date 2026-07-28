import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { openRaceEthnicityPreferenceLabel, raceEthnicityOptions } from '../utils/raceEthnicity'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('racial and ethnic identity settings', () => {
  it('uses one shared taxonomy across onboarding, profile settings and preference validation', () => {
    expect(openRaceEthnicityPreferenceLabel).toBe('Open to all backgrounds')
    expect(raceEthnicityOptions).toEqual([
      'Asian',
      'Black',
      'African',
      'Caribbean',
      'Latin American',
      'Middle Eastern',
      'North African',
      'White',
      'Mixed ethnicity',
      'Indigenous',
      'Pacific Islander',
      'Another ethnic background',
      'Prefer to self-describe',
    ])

    for (const file of [
      'pages/onboarding.vue',
      'pages/account/v2/index.vue',
      'pages/preferences/dating.vue',
      'server/api/preferences/dating.put.ts',
      'server/api/profile/me.put.ts',
      'server/api/profile/basics.put.ts',
    ]) {
      expect(read(file)).toContain("from '~/utils/raceEthnicity'")
    }
  })

  it('normalises preference state and supports a bounded self-description', () => {
    const preferencesApi = read('server/api/preferences/dating.put.ts')
    const profileApi = read('server/api/profile/me.put.ts')
    const migration = read('docs/migrations/20260802_refine_race_ethnicity_taxonomy.sql')

    expect(preferencesApi).toContain('noRaceEthnicityPreference ? [] : requestedRaceEthnicities')
    expect(preferencesApi).toContain("if (!noRaceEthnicityPreference && !raceEthnicities.length)")
    expect(profileApi).toContain('raceEthnicitySelfDescriptionLimit')
    expect(migration).toContain('race_ethnicity_self_description')
    expect(migration).toContain("array['Black', 'African', 'Caribbean']")
  })
})
