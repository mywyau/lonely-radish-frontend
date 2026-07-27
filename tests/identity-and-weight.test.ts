import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('sexual orientation and profile weight', () => {
  it('stores and filters sexual orientation separately from gender', () => {
    const migration = read('docs/migrations/20260823_add_sexual_orientation_preferences.sql')
    const preferences = read('server/api/preferences/dating.put.ts')
    const discovery = read('server/utils/discoveryFilters.ts')
    expect(migration).toContain('sexual_orientation')
    expect(migration).toContain('interested_orientations')
    expect(preferences).toContain('no_orientation_preference')
    expect(preferences).toContain('Choose at least one sexual orientation you are open to dating')
    expect(read('pages/onboarding.vue')).toContain('!preferences.orientations.length')
    expect(discovery).toContain('p.sexual_orientation=any(mine.interested_orientations)')
    expect(discovery).toContain('viewer.sexual_orientation=any(theirs.interested_orientations)')
  })

  it('allows an optional weight next to height and displays it on profiles', () => {
    const migration = read('docs/migrations/20260824_add_profile_weight.sql')
    const lifestyle = read('server/api/profile/lifestyle.put.ts')
    const account = read('pages/account/v2/index.vue')
    const profile = read('pages/profiles/[slug].vue')
    expect(migration).toContain('weight_kg')
    expect(lifestyle).toContain('weight_kg=$3')
    expect(account).toContain('v-model.number="lifestyle.weightKg"')
    expect(account).toContain('min="35" max="300"')
    expect(profile).toContain('`${profile.value.weightKg} kg`')
  })
})
