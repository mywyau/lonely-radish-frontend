import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('matches and date planning dashboard', () => {
  it('groups persisted matches by their next action', () => {
    const page = read('pages/matches/index.vue')
    expect(page).toContain("'/api/matches'")
    expect(page).toContain("return 'Start planning'")
    expect(page).toContain("return 'Edit date details'")
    expect(page).toContain("'Review proposal'")
    expect(read('server/api/matches/index.get.ts')).toContain("proposalStatus === 'accepted' ? 'confirmed'")
  })

  it('allows a proposal to be confirmed and material details to be edited', () => {
    expect(read('server/api/proposals/[id]/respond.post.ts')).toContain("['accepted', 'declined']")
    expect(read('server/api/proposals/[id].put.ts')).toContain("status='pending',selected_time_id=null")
    expect(read('pages/plans/[slug].vue')).toContain('Save date changes')
    expect(read('pages/plans/[slug].vue')).toContain("respond('accepted', time.id)")
  })

  it('shows at most five matches and confirms removal before notifying the other person', () => {
    expect(read('server/api/matches/index.get.ts')).toContain('limit 5')
    expect(read('pages/matches/index.vue')).toContain('You have {{ additionalMatches }} more')
    expect(read('pages/matches/index.vue')).toContain('<strong>{{ totalMatches }}</strong><span>Total matches</span>')
    expect(read('pages/matches/index.vue')).toContain('<strong>{{ interestReceivedCount }}</strong><span>People interested in you</span>')
    expect(read('server/api/matches/index.get.ts')).toContain('count(distinct di.sender_id)::int as count')
    expect(read('pages/matches/index.vue')).toContain('You can have up to 5 active matches')
    const migration = read('docs/migrations/20260722_enforce_five_active_matches.sql')
    expect(migration).toContain('matches_enforce_five_active')
    expect(migration).toContain('pg_advisory_xact_lock')
    expect(read('pages/matches/index.vue')).toContain('Yes, remove match')
    const remove = read('server/api/matches/[id].delete.ts')
    expect(remove).toContain("set status='unmatched'")
    expect(remove).toContain("'match_ended'")
  })
})
