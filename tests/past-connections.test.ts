import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('past connections', () => {
  it('records why and when a match ended', () => {
    expect(read('server/api/matches/[id].delete.ts')).toContain("ended_reason='removed'")
    expect(read('server/api/dates/[id]/follow-up.post.ts')).toContain("ended_reason='post_date'")
    expect(read('docs/migrations/20260723_add_match_end_history.sql')).toContain('ended_by')
  })

  it('lists ended matches with privacy-aware actions', () => {
    const api = read('server/api/matches/past.get.ts')
    expect(api).toContain("m.status='unmatched'")
    expect(api).toContain('canViewProfile')
    const page = read('pages/matches/past.vue')
    expect(page).toContain("'/api/matches/past'")
    expect(page).toContain('Past connections')
    expect(page).toContain('Review your answer')
    expect(page).toContain('Send an apology')
    expect(page).toContain("`/api/matches/${connection.id}/apology`")
    expect(api).toContain('match_apology_notes')
    expect(page).toContain('lonely-radish-preview-rejected-match')
    expect(page).toContain("query: { connection: 'past' }")
    expect(page).toContain('View unmatched profile')
    expect(page).toContain('Load more past connections')
    expect(read('pages/matches/index.vue')).toContain("localStorage.setItem('lonely-radish-preview-rejected-match'")
  })
})
