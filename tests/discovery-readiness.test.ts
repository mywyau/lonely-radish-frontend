import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('discovery readiness', () => {
  it('calculates readiness from persisted profile data', () => {
    const endpoint = read('server/api/profile/readiness.get.ts')
    expect(endpoint).toContain('profileBasics')
    expect(endpoint).toContain('profile_photos')
    expect(endpoint).toContain('photoCount')
    expect(endpoint).toContain('photosRequired = 1')
    expect(endpoint).toContain('Math.min(photoCount / photosRequired, 1)')
    expect(endpoint).toContain('profile_activities')
    expect(endpoint).toContain('p.location is not null')
    expect(endpoint).toContain('dating_preferences_set=true')
    expect(endpoint).toContain('percentage')
  })

  it('shows actionable progress on the account page', () => {
    const account = read('pages/account/v2/index.vue')
    expect(account).toContain('Discovery readiness')
    expect(account).toContain("'/api/profile/readiness'")
    expect(account).toContain('readiness.percentage')
    expect(account).toContain('photosRequired')
    expect(account).toContain('at least ${readiness.value?.photosRequired ?? 1} required')
    expect(account).toContain('readinessCollapsed.value = readiness.value.percentage === 100')
    expect(account).toContain(':aria-expanded="!readinessCollapsed"')
    expect(account).toContain('v-show="!readinessCollapsed"')
    expect(account).toContain('to="/account/controls"')
    expect(account).not.toContain('<h2 class="text-xl font-semibold">Pause discovery</h2>')
    expect(account).toContain('/preferences#location-and-age')
    expect(account).toContain('/preferences/activities')
    expect(account).toContain('/preferences/dating')
  })
})
