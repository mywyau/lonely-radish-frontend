import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('regular web application auth flow', () => {
  const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

  it('keeps the client secret server-side and uses authorization code exchange', () => {
    const login = read('server/api/auth/login.get.ts')
    const callback = read('server/api/auth/callback.get.ts')
    const session = read('server/utils/authSession.ts')

    expect(login).toContain("response_type: 'code'")
    expect(callback).toContain("grant_type: 'authorization_code'")
    expect(callback).toContain("required('AUTH0_CLIENT_SECRET')")
    expect(callback).toContain('payload.nonce !== flow.data.nonce')
    expect(callback).toContain('payload.email_verified !== true')
    expect(callback).toContain('This email/password account hasn’t been verified.')
    expect(callback).toContain('accountCollisionMessage')
    expect(callback).toContain('isUniqueConstraintViolation')
    expect(login).toContain("audience !== 'your-auth0-api-identifier'")
    expect(login).toContain("query.mode === 'signup'")
    expect(login).toContain("authorizeUrl.searchParams.set('screen_hint', 'signup')")
    expect(login).toContain("} else {")
    expect(login).toContain("'prompt', 'login select_account'")
    expect(read('composables/useAuth.ts')).toContain('/api/auth/login?mode=switch&returnTo=')
    expect(read('pages/please-sign-in.vue')).not.toContain('Use another account')
    expect(session).toContain("httpOnly: true")
    expect(session).toContain("sameSite: 'lax'")
  })
})
