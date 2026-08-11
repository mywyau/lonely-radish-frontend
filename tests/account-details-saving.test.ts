import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readPage } from './pageTestUtils'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('account details saving', () => {
  it('saves private names independently from required public profile fields', () => {
    const page = readPage('account/v2/index.vue')
    expect(page).toContain('@submit.prevent="saveAccountDetails"')
    expect(page).toContain('@submit.prevent="saveProfileBasics"')
    expect(page).toContain('/api/account/v2/profile')
    expect(page).toContain("'/api/profile/basics'")
    expect(page).toContain('await resolve()')
    expect(page).toContain("profile.firstName = user.value?.firstName || ''")
    expect(page).not.toContain("'/api/meV2'")
    expect(page.match(/\$fetch<ContactDetails>\('\/api\/profile\/contact'/g)).toHaveLength(1)
    expect(page).toContain('applyContactDetails(result.contactDetails)')
    expect(page).toContain('finally {\n    accountIdentityLoading.value = false')
    expect(page).toContain('accountIdentityLoading')
    expect(page).not.toContain('Promise.all([')
    expect(page.match(/v-model="profile.firstName"/g)).toHaveLength(1)
    expect(page).toContain('You have unsaved account detail changes.')
    expect(page).toContain('Account details saved successfully.')
    expect(page).toContain('@input="markAccountDetailsChanged"')
    expect(page).toContain('v-model="profile.genderIdentity"')
    expect(page).toContain('v-model="profile.pronouns"')
    expect(page).toContain('Shown on your profile when provided.')
  })

  it('updates public basics atomically for the authenticated profile', () => {
    const endpoint = read('server/api/profile/basics.put.ts')
    expect(endpoint).toContain('requireUser(event)')
    expect(endpoint).toContain('display_name=$2,race_ethnicity=$3')
    expect(endpoint).toContain('sexual_orientation=$4')
    expect(endpoint).toContain('gender_identity=$6,pronouns=$7')
    expect(endpoint).toContain('[sub, displayName, raceEthnicity, sexualOrientation, raceEthnicitySelfDescription, genderIdentity, pronouns]')
  })

  it('shows contact validation errors instead of relying on native browser validation', () => {
    const page = readPage('account/v2/index.vue')
    expect(page).toContain('novalidate @submit.prevent="saveContactDetails"')
    expect(page).toContain('Enter a valid phone number containing 7 to 15 digits.')
    expect(page).toContain('Enter a valid contact email address.')
    expect(page).toContain('Add at least one contact detail before sharing with matches.')
    expect(page).toContain('contactLoadError')
  })

  it('keeps discovery readiness visible when loading fails and offers recovery', () => {
    const page = readPage('account/v2/index.vue')
    expect(page).toContain('readinessLoading')
    expect(page).toContain('readinessError')
    expect(page).toContain('@click="loadReadiness"')
    expect(page).toContain('Sign in again')
    expect(page).not.toContain('<section v-if="readiness"')
    expect(page).not.toContain('resolve({ force: true })')
  })

  it('allows account and contact detail panels to collapse independently', () => {
    const page = readPage('account/v2/index.vue')
    expect(page).toContain('accountDetailsCollapsed')
    expect(page).toContain('contactDetailsCollapsed')
    expect(page).toContain('aria-controls="account-details-panel"')
    expect(page).toContain('aria-controls="contact-details-panel"')
    expect(page).toContain('id="account-details-panel" v-show="!accountDetailsCollapsed"')
    expect(page).toContain('id="contact-details-panel" v-show="!contactDetailsCollapsed"')
  })
})
