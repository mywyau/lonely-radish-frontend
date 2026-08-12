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

  it('keeps payment out of visibility, ranking, matching, planning and safety promises', () => {
    const membership = read('pages/upgrade/index.vue')
    expect(membership).toContain('does not sell better visibility, priority or access to people')
    expect(membership).toContain('Meeting, matching and planning remain available without subscribing')
    expect(membership).toContain('Safety and privacy controls are never reserved for supporters')
    expect(membership).toContain('No boost, priority placement or hidden safety features')
    expect(membership).not.toContain('Advanced matching options and filters')
  })
})
