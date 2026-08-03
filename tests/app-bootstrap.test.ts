import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('authenticated application bootstrap', () => {
  it('returns shared identity, role, mode, onboarding and counter state in one endpoint', () => {
    const endpoint = read('server/api/bootstrap.get.ts')
    expect(endpoint).toContain('requireUser(event)')
    expect(endpoint).toContain('u.role=\'admin\' as "isAdmin"')
    expect(endpoint).toContain('as "matchCount"')
    expect(endpoint).toContain('as "unreadNotificationCount"')
    expect(endpoint).toContain('as "onboardingComplete"')
    expect(endpoint).toContain('as "activeMatchLimit"')
    expect(endpoint.match(/db\.query/g)).toHaveLength(1)
  })

  it('does not reload navigation, admin, business-mode or onboarding state on route changes', () => {
    const nav = read('components/BlankNavBar.vue')
    expect(nav).not.toContain('/api/navigation/counts')
    expect(nav).not.toContain('/api/admin/me')
    expect(nav).not.toContain('watch(() => route.fullPath')
    expect(read('middleware/admin.ts')).not.toContain("$fetch('/api/admin/me')")
    expect(read('middleware/business-only.ts')).not.toContain('/api/account/mode')
    expect(read('middleware/account-mode.global.ts')).not.toContain('/api/account/mode')
    expect(read('middleware/logged-in.ts')).not.toContain('/api/onboarding/status')
  })

  it('refreshes stale bootstrap state on return and updates counters after mutations', () => {
    const state = read('composables/useMeStateV2.ts')
    const plugin = read('plugins/auth.client.ts')
    expect(state).toContain('bootstrapMaxAgeMs = 60_000')
    expect(state).toContain('refreshIfStale')
    expect(plugin).toContain("document.addEventListener('visibilitychange'")
    expect(plugin).toContain("window.addEventListener('focus'")
    expect(read('pages/notifications.vue')).toContain('adjustUnreadNotificationCount(-1)')
    expect(read('pages/interests/received.vue')).toContain('adjustMatchCount(1)')
    expect(read('pages/matches/index.vue')).toContain('adjustMatchCount(-1)')
  })
})
