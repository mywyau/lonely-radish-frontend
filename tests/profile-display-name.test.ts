import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('editable profile name', () => {
  it('keeps profile names separate from private account names', () => {
    const page = read('pages/account/v2/index.vue')
    expect(page).toContain('Profile name')
    expect(page).toContain('/api/profile/basics')
    expect(page).toContain('does not change your private first or last name')
    expect(page).toContain(':maxlength="profileNameLimit"')
    expect(page).toContain('{{ profile.displayName.length }}/{{ profileNameLimit }}')
  })

  it('uses the same concise limit in every profile-name entry point', () => {
    expect(read('utils/profileName.ts')).toContain('PROFILE_NAME_LIMIT = 30')
    expect(read('pages/onboarding.vue')).toContain('const displayNameLimit = PROFILE_NAME_LIMIT')
    for (const endpoint of [
      'server/api/profile/me.put.ts',
      'server/api/profile/basics.put.ts',
      'server/api/profile/display-name.put.ts',
      'server/api/profile/name-availability.get.ts',
    ]) {
      expect(read(endpoint)).toContain("from '~/utils/profileName'")
      expect(read(endpoint)).toContain('PROFILE_NAME_LIMIT')
    }
  })

  it('enforces case-insensitive uniqueness without changing the profile slug', () => {
    const endpoint = read('server/api/profile/basics.put.ts')
    expect(read('docs/migrations/20260729_unique_profile_names.sql')).toContain('lower(trim(display_name))')
    expect(endpoint).toContain('returning display_name as "displayName",slug')
    expect(endpoint).toContain("code === '23505'")
    expect(endpoint).not.toContain('set slug=')
  })
})
