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

  it('allows one apology-led second chance through fresh interest', () => {
    const profileApi = read('server/api/profiles/[slug].get.ts')
    const interestApi = read('server/api/interests/index.post.ts')
    const acceptApi = read('server/api/interests/[id]/accept.post.ts')
    const profilePage = read('pages/profiles/[slug].vue')
    expect(profileApi).toContain('"secondChanceAvailable"')
    expect(profileApi).toContain('man.created_at>relationship.ended_at')
    expect(interestApi).toContain('Send an apology before asking for a second chance')
    expect(interestApi).toContain("set status='active',matched_at=now()")
    expect(interestApi).toContain('delete from date_proposals where match_id=$1')
    expect(acceptApi).toContain("set status='active',matched_at=now()")
    expect(acceptApi).toContain('delete from date_proposals where match_id=$1')
    expect(profilePage).toContain('Show interest in ${profile.name} again')
    expect(profilePage).toContain('the other person still chooses whether to accept')
  })
})
