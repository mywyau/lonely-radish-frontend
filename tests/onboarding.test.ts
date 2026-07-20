import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('first-login onboarding', () => {
  it('redirects incomplete authenticated users into a resumable flow', () => {
    expect(read('server/api/auth/callback.get.ts')).toContain('/onboarding?redirect=')
    expect(read('middleware/logged-in.ts')).toContain('/api/onboarding/status')
    expect(read('pages/onboarding.vue')).toContain("step.value = status.nextStep")
  })

  it('persists every onboarding stage before completion', () => {
    const page = read('pages/onboarding.vue')
    expect(page).toContain("'/api/account/v2/profile'")
    expect(page).toContain("'/api/profile/me'")
    expect(page).toContain("'/api/preferences/activities'")
    expect(page).toContain("'/api/preferences/general'")
    expect(page).toContain("'/api/preferences/dating'")
    expect(page).toContain("'/api/onboarding/complete'")
    expect(read('server/api/onboarding/complete.post.ts')).toContain('Please finish every onboarding step')
  })
})
