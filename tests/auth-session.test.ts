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
    expect(login).toContain("audience !== 'your-auth0-api-identifier'")
    expect(login).toContain("query.mode === 'signup'")
    expect(login).toContain("authorizeUrl.searchParams.set('screen_hint', 'signup')")
    expect(session).toContain("httpOnly: true")
    expect(session).toContain("sameSite: 'lax'")
  })
})
