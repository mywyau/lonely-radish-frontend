import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('match-only contact details', () => {
  it('stores contact data separately with sharing disabled by default', () => {
    const migration = read('docs/migrations/20260728_match_contact_details.sql')
    expect(migration).toContain('create table if not exists profile_contact_details')
    expect(migration).toContain('share_with_matches boolean not null default false')
    expect(migration).toContain('on delete cascade')
  })

  it('only returns opted-in contact details to active matches', () => {
    const api = read('server/api/profiles/[slug].get.ts')
    expect(api).toContain('profile.isMatched')
    expect(api).toContain('share_with_matches=true')
    expect(api).toContain('contactDetails: contactDetails.rows[0] ?? null')
  })

  it('lets an account owner manage sharing without putting activities in account details', () => {
    const page = read('pages/account/v2/index.vue')
    expect(page).toContain('Contact details for matches')
    expect(page).toContain('Share with active matches')
    expect(page).toContain('Social or contact handle <span class="font-normal text-[#6E4D58]">(optional)</span>')
    expect(page).toContain('Phone number <span class="font-normal text-[#6E4D58]">(optional)</span>')
    expect(page).toContain('Contact email <span class="font-normal text-[#6E4D58]">(optional)</span>')
    expect(page).not.toContain('Edit activities')
    expect(page).not.toContain('Edit schedule and safety')
    expect(page).not.toContain('Manage blocked users')
    expect(page).not.toContain('Preferred activity')
  })

  it('keeps the three demo profiles available and clearly labelled', () => {
    const page = read('pages/profiles/[slug].vue')
    expect(page.match(/isDemo: true/g)).toHaveLength(3)
    expect(page).toContain('Demo profile')
  })
})
