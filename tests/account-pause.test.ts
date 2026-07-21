import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('account discovery pause', () => {
  it('supports timed, indefinite, and immediate resume choices', () => {
    const api = read('server/api/account/pause.put.ts')
    expect(api).toContain("['7_days', '30_days', 'indefinite', 'resume']")
    expect(api).toContain("now()+interval '7 days'")
    expect(api).toContain("then 'active' else 'paused'")
  })

  it('automatically treats expired pauses as discoverable', () => {
    expect(read('server/api/profiles/[slug].get.ts')).toContain('u.paused_until<=now()')
    expect(read('server/api/activities/[slug]/people.get.ts')).toContain('u.paused_until<=now()')
    expect(read('server/api/account/pause.get.ts')).toContain("paused_until<=now() then 'active'")
  })

  it('prevents paused users sending new interest while preserving existing match routes', () => {
    expect(read('server/api/interests/index.post.ts')).toContain('Resume your profile before sending new interest')
    expect(read('pages/account/v2/index.vue')).toContain('keeping existing matches, plans, and confirmed dates available')
  })
})
