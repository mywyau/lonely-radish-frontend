import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('match momentum', () => {
  it('marks a one-sided accepted interest as the recipient’s move', () => {
    const repository = read('server/repositories/matches.ts')
    const service = read('server/services/matches/MatchService.ts')
    expect(repository).toContain('action_required_by=$2')
    expect(repository).toContain('action_required_by=$1 and action_completed_at is null')
    expect(service).toContain('Make a plan with your new connection or close it before accepting another interest')
  })

  it('keeps reciprocal interests automatic and free of a required action', () => {
    const service = read('server/services/interests/InterestService.ts')
    const repository = read('server/repositories/interests.ts')
    expect(service).toContain('hasReverseInterest')
    expect(repository).toContain('action_required_by=null')
    expect(service).toContain('matched = true')
  })

  it('clears the required action through planning or closing the match', () => {
    const page = read('pages/matches/index.vue')
    expect(read('server/api/proposals/index.post.ts')).toContain('set action_completed_at=now()')
    expect(read('server/api/matches/[id].delete.ts')).toContain("status='unmatched'")
    expect(page).toContain("if (match.yourMove) return 'Choose what happens next'")
    expect(page).toContain("match.yourMove")
    expect(page).toContain("bg-[#FFF1C7] text-[#694C00]")
    expect(page).toContain(':class="statusBadgeClass(match)"')
    expect(page).not.toContain('opening-note')
  })

  it('keeps capacity state without exposing internal counters to members', () => {
    const endpoint = read('server/api/matches/index.get.ts')
    const page = read('pages/matches/index.vue')
    expect(endpoint).toContain('action_required_by=$1 and action_completed_at is null')
    expect(endpoint).toContain("count(*) filter(where status='active')")
    expect(endpoint).toContain('interest_inbox_state')
    expect(endpoint.match(/database\.query/g)).toHaveLength(1)
    expect(endpoint).toContain('manualMatchLimit: 1')
    expect(page).toContain('acceptedInterestNeedsActionCount.value = result.manualMatchCount')
    expect(page).toContain('v-if="acceptedInterestNeedsActionCount"')
    expect(page).toContain('v-if="connectionListFull"')
    expect(page).not.toContain('Manual matches')
  })

  it('uses bounded participant lookups and enriches only the visible match page', () => {
    const endpoint = read('server/api/matches/index.get.ts')
    const migration = read('docs/migrations/20260906_optimize_matches_dashboard.sql')
    expect(endpoint).toContain('where m.user_one_id=$1')
    expect(endpoint).toContain('union all')
    expect(endpoint).toContain('where m.user_two_id=$1')
    expect(endpoint).toContain('limited as materialized')
    expect(endpoint.indexOf('limit 25')).toBeLessThan(endpoint.indexOf('from profile_photos'))
    expect(migration).toContain('matches_live_user_one_idx')
    expect(migration).toContain('matches_live_user_two_idx')
    expect(migration).toContain('business_offer_claims_live_proposal_idx')
  })

  it('allows received interests to remain visible and be passed on', () => {
    const page = read('pages/interests/received.vue')
    expect(page).toContain('You can still view profiles, pass and show interest in other people.')
    expect(page).toContain("'people are' }} waiting for your answer")
    expect(page).not.toContain('manual-match-rules')
    expect(page).toContain('declineInterest(person)')
    expect(read('server/api/interests/[id].delete.ts')).toContain('declined_at=now()')
  })

  it('adds the required database state', () => {
    const migration = read('docs/migrations/20260825_add_match_momentum.sql')
    expect(migration).toContain('action_required_by')
    expect(migration).toContain('declined_at')
  })

  it('preserves capacity-limited matches in a visible queue', () => {
    const interestRepository = read('server/repositories/interests.ts')
    const matchRepository = read('server/repositories/matches.ts')
    const queue = read('server/utils/matchQueue.ts')
    const activate = read('server/api/matches/[id]/activate.post.ts')
    const discovery = read('server/api/activities/people.get.ts')
    const navigation = read('server/api/navigation/counts.get.ts')
    const emails = read('server/utils/notificationEmail.ts')
    const page = read('pages/matches/index.vue')
    const migration = read('docs/migrations/20260827_add_queued_matches.sql')
    expect(interestRepository).toContain("values($1,$2,'queued')")
    expect(matchRepository).toContain("values($1,$2,'queued',$3)")
    expect(queue).toContain('savepoint activate_queued_match')
    expect(queue).toContain("set status='active',matched_at=now()")
    expect(activate).toContain("status='queued'")
    expect(activate).toContain("kind='match_queued'")
    expect(discovery).toContain("m.status in ('active','queued')")
    expect(navigation).toContain("status in ('active','queued')")
    expect(emails).toContain("match_queued: 'matches'")
    expect(page).toContain("title: 'Waiting to start'")
    expect(page).toContain('activateQueuedMatch(match)')
    expect(migration).toContain("'active','queued','unmatched','blocked'")
    expect(migration).toContain("'match_queued'")
  })
})
