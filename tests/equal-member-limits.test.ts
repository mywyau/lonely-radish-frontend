import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { getActiveMatchLimit } from '../server/utils/planLimits'
import { MEMBER_ACTIVE_MATCH_LIMIT, MEMBER_ACTIVITY_SELECTION_LIMIT } from '../server/utils/memberLimits'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('equal member limits', () => {
  it('does not query billing state to decide match capacity', async () => {
    const database = { query: vi.fn(() => { throw new Error('billing should not be queried') }) }
    await expect(getActiveMatchLimit('member-1', database as any)).resolves.toBe(MEMBER_ACTIVE_MATCH_LIMIT)
    expect(database.query).not.toHaveBeenCalled()
    expect(MEMBER_ACTIVE_MATCH_LIMIT).toBe(5)
  })

  it('gives every member the full activity-expression limit', () => {
    expect(MEMBER_ACTIVITY_SELECTION_LIMIT).toBe(10)
    for (const endpoint of [
      read('server/api/preferences/activities.get.ts'),
      read('server/api/preferences/activities.put.ts'),
      read('server/services/onboardingBootstrap.ts'),
    ]) {
      expect(endpoint).toContain('MEMBER_ACTIVITY_SELECTION_LIMIT')
      expect(endpoint).not.toContain('hasPaidAccess')
      expect(endpoint).not.toContain('paidAccess')
    }
  })

  it('does not remove profile activities when a supporter membership ends', () => {
    const entitlementSync = read('server/services/billing/syncEntitlementFromBillingSubscription.ts')
    expect(entitlementSync).not.toContain('delete from profile_activities')
    expect(entitlementSync).not.toContain('position>5')
  })

  it('describes support plainly without advertising a dating advantage', () => {
    const membership = read('pages/upgrade/index.vue')
    expect(membership).toContain('All the core features stay free')
    expect(membership).toContain('No change to your matches or visibility')
    expect(membership).toContain('Helps cover hosting and development')
    expect(membership).not.toContain('Advanced matching options and filters')
    expect(membership).not.toContain('priority placement')
  })
})
