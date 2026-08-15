import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { activeAuthFlowAttempts, findAuthFlowAttempt } from '../server/utils/authSession'

describe('regular web application auth flow', () => {
  const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

  it('keeps the client secret server-side and uses authorization code exchange', () => {
    const login = read('server/api/auth/login.get.ts')
    const callback = read('server/api/auth/callback.get.ts')
    const session = read('server/utils/authSession.ts')

    expect(login).toContain("response_type: 'code'")
    expect(callback).toContain("grant_type: 'authorization_code'")
    expect(callback).toContain("required('AUTH0_CLIENT_SECRET')")
    expect(callback).toContain('payload.nonce !== attempt.nonce')
    expect(callback).toContain('payload.email_verified !== true')
    expect(callback).toContain('This email/password account hasn’t been verified.')
    expect(callback).toContain('accountCollisionMessage')
    expect(callback).toContain('isUniqueConstraintViolation')
    expect(login).toContain("audience !== 'your-auth0-api-identifier'")
    expect(login).toContain("query.mode === 'signup'")
    expect(login).toContain("authorizeUrl.searchParams.set('screen_hint', 'signup')")
    expect(login).toContain("} else {")
    expect(login).toContain("'prompt', 'login select_account'")
    expect(login).toContain('activeAuthFlowAttempts(flow.data)')
    expect(login).toContain('.slice(-3)')
    expect(callback).toContain('findAuthFlowAttempt(flow.data, queryState)')
    expect(callback).toContain('This sign-in attempt expired or was replaced.')
    expect(read('server/api/auth/logout.get.ts')).toContain('useAuthFlowSession(event)')
    expect(read('composables/useAuth.ts')).toContain('/api/auth/login?mode=switch&returnTo=')
    expect(read('pages/please-sign-in.vue')).not.toContain('Use another account')
    expect(session).toContain("httpOnly: true")
    expect(session).toContain("sameSite: 'lax'")
    expect(session).toContain('maxAge: 60 * 60 * 24')
  })

  it('keeps recent parallel login attempts while rejecting expired state', () => {
    const now = Date.now()
    const attempts = [
      { state: 'expired', nonce: 'old', returnTo: '/', intent: 'personal' as const, createdAt: now - 11 * 60 * 1000 },
      { state: 'first', nonce: 'one', returnTo: '/matches', intent: 'personal' as const, createdAt: now - 1000 },
      { state: 'second', nonce: 'two', returnTo: '/business', intent: 'business' as const, createdAt: now },
    ]
    expect(activeAuthFlowAttempts({ attempts }, now).map(attempt => attempt.state)).toEqual(['first', 'second'])
    expect(findAuthFlowAttempt({ attempts }, 'first', now)).toMatchObject({ nonce: 'one', returnTo: '/matches' })
    expect(findAuthFlowAttempt({ attempts }, 'expired', now)).toBeNull()
  })

  it('accepts an existing single-attempt cookie during a rolling deployment', () => {
    expect(findAuthFlowAttempt({
      state: 'legacy', nonce: 'nonce', returnTo: '/matches', intent: 'personal',
    }, 'legacy')).toMatchObject({ state: 'legacy', nonce: 'nonce', returnTo: '/matches' })
  })
})
