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
    expect(api).toContain('profile.isMatched\n      ? db.query')
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
    expect(page).toMatch(/Demo\s+profile/)
  })

  it('shows a neutral social icon only when a shared handle exists', () => {
    const page = read('pages/profiles/[slug].vue')
    expect(page).toContain('AtSign')
    expect(page).toContain('v-if="profile.contactDetails.socialHandle"')
    expect(page).toContain('{{ profile.contactDetails.socialHandle }}')
    expect(page).toContain('aria-hidden="true"')
  })

  it('previews the owner’s saved contact details without changing live visibility', () => {
    const api = read('server/api/profile/me.get.ts')
    const preview = read('pages/profile/preview.vue')
    expect(api).toContain('from profile_contact_details where user_id=$1')
    expect(api).toContain('contactDetails: contactDetails.rows[0] ?? null')
    expect(preview).toContain('v-if="hasContactDetails && data.contactDetails"')
    expect(preview).toContain('Shared with active matches')
    expect(preview).toContain('Currently hidden')
    expect(preview).toContain('{{ data.contactDetails.socialHandle }}')
    expect(preview).toContain('Manage contact sharing')
  })

  it('matches the live availability and contact flip in the owner preview', () => {
    const preview = read('pages/profile/preview.vue')
    expect(preview).toContain('const availabilityContactFlipped = ref(false)')
    expect(preview).toContain("availabilityContactFlipped && 'is-flipped'")
    expect(preview).toContain('aria-label="Show saved contact details"')
    expect(preview).toContain('aria-label="Show usual availability"')
    expect(preview).toContain('.availability-contact-flip.is-flipped')
    expect(preview).toContain('availabilityContactFlipped.value = false')
    expect(preview).toContain('Preview only — these saved details are currently hidden from matches.')
  })

  it('lets an active match flip availability to shared contact details', () => {
    const profile = read('pages/profiles/[slug].vue')
    expect(profile).toContain('const availabilityContactFlipped = ref(false)')
    expect(profile).toContain('const hasSharedContactDetails = computed')
    expect(profile).toContain("availabilityContactFlipped && 'is-flipped'")
    expect(profile).toContain('aria-label="Show shared contact details"')
    expect(profile).toContain('aria-label="Show usual availability"')
    expect(profile).toContain('.availability-contact-flip.is-flipped')
    expect(profile).toContain('availabilityContactFlipped.value = false')
  })
})
