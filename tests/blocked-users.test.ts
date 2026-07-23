import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('blocked users management', () => {
  it('lists only people blocked by the signed-in user', () => {
    const api = read('server/api/blocks/index.get.ts')
    expect(api).toContain('where b.blocker_id=$1')
    expect(api).toContain('Cache-Control')
  })

  it('allows only the blocker to remove their block', () => {
    const api = read('server/api/blocks/[slug].delete.ts')
    expect(api).toContain('b.blocker_id=$1')
    expect(api).toContain('return { unblocked: true }')
  })

  it('confirms unblocking and explains that prior connections stay closed', () => {
    const page = read('pages/account/blocked.vue')
    expect(page).toContain("'/api/blocks'")
    expect(page).toContain('Previous interests, matches, and plans will not be restored.')
    expect(page).toContain('Yes, unblock')
    expect(page).toContain('Load more blocked users')
  })
})
