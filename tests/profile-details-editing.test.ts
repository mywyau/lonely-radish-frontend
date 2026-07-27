import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readPage } from './pageTestUtils'

describe('profile details editing', () => {
  it('provides a dedicated page for bio and lifestyle details', () => {
    const page = readPage('profile/details.vue')
    expect(page).toContain("title: 'About me & lifestyle · Lonely Radish'")
    expect(page).toContain('v-model="bio"')
    expect(page).toContain('{{ bio.length }}/{{ bioLimit }}')
    expect(page).toContain("'/api/profile/bio'")
    expect(page).toContain('Lifestyle and profile details')
    expect(page).toContain("'/api/profile/lifestyle'")
    expect(page).toContain('to="/profile/preview"')
  })

  it('links from account settings instead of duplicating the lifestyle form', () => {
    const account = readPage('account/v2/index.vue')
    expect(account).toContain('to="/profile/details"')
    expect(account).toContain('About me & lifestyle')
    expect(account).not.toContain('function saveLifestyle()')
    expect(account).not.toContain('@submit.prevent="saveLifestyle"')
  })

  it('updates only the signed-in user bio with server-side validation', () => {
    const endpoint = readFileSync(
      resolve(process.cwd(), 'server/api/profile/bio.put.ts'),
      'utf8',
    )
    expect(endpoint).toContain('requireUser(event)')
    expect(endpoint).toContain("'About me', 1000, true")
    expect(endpoint).toContain('update profiles set bio=$2')
    expect(endpoint).toContain('[sub, bio]')
  })
})
