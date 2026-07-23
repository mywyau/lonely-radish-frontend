import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('cursor pagination', () => {
  it('uses validated opaque cursors with stable tie breakers', () => {
    const utility = read('server/utils/cursorPagination.ts')
    expect(utility).toContain("toString('base64url')")
    expect(utility).toContain('Invalid pagination cursor')
    expect(utility).toContain('rows.length > pageSize')
  })

  for (const [endpoint, page, label] of [
    ['server/api/activities/[slug]/people.get.ts', 'pages/activities/[slug].vue', 'Load more people'],
    ['server/api/notifications.get.ts', 'pages/notifications.vue', 'Load more notifications'],
    ['server/api/blocks/index.get.ts', 'pages/account/blocked.vue', 'Load more blocked users'],
    ['server/api/matches/past.get.ts', 'pages/matches/past.vue', 'Load more past connections'],
  ]) {
    it(`paginates ${endpoint}`, () => {
      const api = read(endpoint)
      const view = read(page)
      expect(api).toContain('decodeCursor')
      expect(api).toContain('pageRows')
      expect(api).toContain('nextCursor')
      expect(api).toContain('hasMore')
      expect(api).toContain('::text as "sortAt"')
      expect(view).toContain(label)
      expect(view).toContain('nextCursor.value')
    })
  }
})
