import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('match momentum', () => {
  it('marks a one-sided accepted interest as the recipient’s move', () => {
    const accept = read('server/api/interests/[id]/accept.post.ts')
    expect(accept).toContain('action_required_by=$2')
    expect(accept).toContain('action_required_by=$1 and action_completed_at is null')
    expect(accept).toContain('Take action on your current new match before accepting another interest')
  })

  it('keeps reciprocal interests automatic and free of a required action', () => {
    const send = read('server/api/interests/index.post.ts')
    expect(send).toContain('if (reverse.rows[0])')
    expect(send).toContain('action_required_by=null')
    expect(send).toContain('matched = true')
  })

  it('clears the required action through planning or closing the match', () => {
    expect(read('server/api/proposals/index.post.ts')).toContain('set action_completed_at=now()')
    expect(read('server/api/matches/[id].delete.ts')).toContain("status='unmatched'")
    expect(read('pages/matches/index.vue')).toContain("if (match.yourMove) return 'Your move'")
    expect(read('pages/matches/index.vue')).not.toContain('opening-note')
  })

  it('shows separate total and manual match capacity counters', () => {
    const endpoint = read('server/api/matches/index.get.ts')
    const page = read('pages/matches/index.vue')
    expect(endpoint).toContain('action_required_by=$1 and action_completed_at is null')
    expect(endpoint).toContain('manualMatchLimit: 1')
    expect(page).toContain('{{ activeMatchCount }}/{{ activeMatchLimit }}')
    expect(page).toContain('{{ manualMatchCount }}/{{ manualMatchLimit }}')
  })

  it('allows received interests to remain visible and be passed on', () => {
    const page = read('pages/interests/received.vue')
    expect(page).toContain('You can still view profiles, pass, and send interests.')
    expect(page).toContain('declineInterest(person)')
    expect(read('server/api/interests/[id].delete.ts')).toContain('declined_at=now()')
  })

  it('adds the required database state', () => {
    const migration = read('docs/migrations/20260825_add_match_momentum.sql')
    expect(migration).toContain('action_required_by')
    expect(migration).toContain('declined_at')
  })

  it('preserves capacity-limited matches in a visible queue', () => {
    const send = read('server/api/interests/index.post.ts')
    const accept = read('server/api/interests/[id]/accept.post.ts')
    const queue = read('server/utils/matchQueue.ts')
    const activate = read('server/api/matches/[id]/activate.post.ts')
    const discovery = read('server/api/activities/[slug]/people.get.ts')
    const navigation = read('server/api/navigation/counts.get.ts')
    const emails = read('server/utils/notificationEmail.ts')
    const page = read('pages/matches/index.vue')
    const migration = read('docs/migrations/20260827_add_queued_matches.sql')
    expect(send).toContain("values($1,$2,'queued')")
    expect(accept).toContain("values($1,$2,'queued',$3)")
    expect(queue).toContain('savepoint activate_queued_match')
    expect(queue).toContain("set status='active',matched_at=now()")
    expect(activate).toContain("status='queued'")
    expect(activate).toContain("kind='match_queued'")
    expect(discovery).toContain("m.status in ('active','queued')")
    expect(navigation).toContain("status in ('active','queued')")
    expect(emails).toContain("match_queued: 'matches'")
    expect(page).toContain("title: 'Matches waiting'")
    expect(page).toContain('activateQueuedMatch(match)')
    expect(migration).toContain("'active','queued','unmatched','blocked'")
    expect(migration).toContain("'match_queued'")
  })
})
