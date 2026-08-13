import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { openRaceEthnicityPreferenceLabel, raceEthnicityOptions, usesRaceEthnicitySelfDescription } from '../utils/raceEthnicity'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('racial and ethnic identity settings', () => {
  it('uses one shared taxonomy across progressive profile settings and preference validation', () => {
    expect(openRaceEthnicityPreferenceLabel).toBe('Open to all backgrounds')
    expect(raceEthnicityOptions).toEqual([
      'Asian',
      'Black',
      'Latin American',
      'Middle Eastern or North African',
      'White',
      'Mixed or multiple backgrounds',
      'Indigenous',
      'Another racial or ethnic background',
      'Prefer not to say',
    ])

    for (const file of [
      'pages/account/v2/index.vue',
      'pages/preferences/dating.vue',
      'server/api/preferences/dating.put.ts',
      'server/api/profile/me.put.ts',
      'server/api/profile/basics.put.ts',
    ]) {
      expect(read(file)).toContain("from '~/utils/raceEthnicity'")
    }
    expect(read('pages/onboarding.vue')).not.toContain("from '~/utils/raceEthnicity'")
    expect(read('pages/onboarding.vue')).toContain('racial or ethnic preferences from Match preferences')
  })

  it('normalises preference state and supports a bounded self-description', () => {
    const preferencesApi = read('server/api/preferences/dating.put.ts')
    const profileApi = read('server/api/profile/me.put.ts')
    const migration = read('docs/migrations/20260903_simplify_race_ethnicity_taxonomy.sql')

    expect(preferencesApi).toContain('noRaceEthnicityPreference ? [] : requestedRaceEthnicities')
    expect(preferencesApi).toContain("if (!noRaceEthnicityPreference && !raceEthnicities.length)")
    expect(profileApi).toContain('raceEthnicitySelfDescriptionLimit')
    expect(usesRaceEthnicitySelfDescription('Another racial or ethnic background')).toBe(true)
    expect(usesRaceEthnicitySelfDescription('Prefer not to say')).toBe(false)
    expect(migration).toContain('race_ethnicity_self_description')
    expect(migration).toContain("when 'African' then array['Black']")
    expect(migration).toContain("when 'North African' then array['Middle Eastern or North African']")
    expect(migration).toContain("when 'Prefer to self-describe' then array['Another racial or ethnic background']")
  })
})
