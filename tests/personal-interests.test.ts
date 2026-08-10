import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('personal profile interests', () => {
  it('stores up to five user-written interests separately from activity categories', () => {
    const migration = read('docs/migrations/20260825_add_personal_interests.sql')
    const putApi = read('server/api/preferences/interests.put.ts')
    expect(migration).toContain('create table if not exists profile_interests')
    expect(migration).toContain('position between 1 and 5')
    expect(migration).toContain('char_length(label) between 1 and 40')
    expect(putApi).toContain("stringArray(body.interests, 'Personal interest', 5, 40)")
    expect(putApi).toContain('delete from profile_interests where user_id=$1')
  })

  it('provides a dedicated editor for adding and removing custom tags', () => {
    const page = read('pages/preferences/interests.vue')
    expect(page).toContain("title: 'Personal Interests · Lonely Radish'")
    expect(page).toContain("'/api/preferences/interests'")
    expect(page).toContain('Save personal interests')
    expect(page).toContain('interests.length }}/{{ limit')
    expect(page).toContain('addInterest')
    expect(page).toContain('removeInterest')
    expect(read('pages/preferences/index.vue')).toContain('to="/preferences/interests"')
  })

  it('shows personal interests instead of derived discovery categories on profiles', () => {
    const profileApi = read('server/api/profiles/[slug].get.ts')
    const meApi = read('server/api/profile/me.get.ts')
    const profile = read('pages/profiles/[slug].vue')
    const preview = read('pages/profile/preview.vue')
    const activityPanel = read('components/ProfileActivityPanel.vue')
    expect(profileApi).toContain('coalesce(personal_interests.items')
    expect(meApi).toContain('personalInterests: personalInterests.rows.map')
    expect(profile).toContain('profile.value.personalInterests')
    expect(activityPanel).toContain('Personal interests')
    expect(preview).toContain('data.personalInterests')
    expect(activityPanel).toContain('My personal interests')
    expect(preview).not.toContain('v-for="interest in data.interestCategories"')
  })
})
