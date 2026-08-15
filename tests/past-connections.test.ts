import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('past connections', () => {
  it('keeps the other-profile query parentheses balanced', () => {
    const endpoint = read('server/api/profiles/[slug].get.ts')
    const query = endpoint.match(/db\.query\(`([\s\S]*?)`, \[slug,viewer\.sub\]\)/)?.[1]
    expect(query).toBeDefined()

    let depth = 0
    for (const character of query!) {
      if (character === '(') depth += 1
      if (character === ')') depth -= 1
      expect(depth).toBeGreaterThanOrEqual(0)
    }
    expect(depth).toBe(0)
  })

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
    expect(page).toContain('Send a note')
    expect(page).toContain("`/api/matches/${connection.id}/apology`")
    expect(api).toContain('match_apology_notes')
    expect(page).toContain('lonely-radish-preview-rejected-match')
    expect(page).toContain("query: { connection: 'past' }")
    expect(page).toContain('View their profile')
    expect(page).toContain('Load more past connections')
    expect(api).toContain('dp.confirmed_at is not null')
    expect(api).toContain('order by dp.confirmed_at desc')
    expect(page).toContain('Last agreed plan:')
    expect(read('pages/matches/index.vue')).toContain("localStorage.setItem('lonely-radish-preview-rejected-match'")
  })

  it('allows one respectful reconnect request after every match ended by the sender', () => {
    const profileApi = read('server/api/profiles/[slug].get.ts')
    const interestService = read('server/services/interests/InterestService.ts')
    const interestRepository = read('server/repositories/interests.ts')
    const matchRepository = read('server/repositories/matches.ts')
    const matchQueue = read('server/utils/matchQueue.ts')
    const profilePage = read('pages/profiles/[slug].vue')
    const pastApi = read('server/api/matches/past.get.ts')
    expect(profileApi).toContain('"secondChanceAvailable"')
    expect(profileApi).toContain('man.created_at>relationship.ended_at')
    expect(interestService).toContain('Send a brief note before asking to reconnect')
    expect(interestRepository).toContain("status='queued',matched_at=now()")
    expect(interestRepository).toContain('delete from date_proposals where match_id=$1')
    expect(matchRepository).toContain("status='queued',matched_at=now()")
    expect(matchRepository).toContain('delete from date_proposals where match_id=$1')
    expect(matchQueue).toContain("set status='active',matched_at=now()")
    expect(profilePage).toContain('Ask ${profile.name} to reconnect')
    expect(profilePage).toContain('there is no pressure on them to accept')
    expect(profilePage).toContain("profile.relationshipStatus === 'unmatched' && !profile.interestSent")
    expect(profilePage).toContain('You asked ${person.name} to reconnect.')
    expect(profilePage).toContain('It’s up to them whether to accept.')
    expect(profilePage).not.toContain('one-time second chance')
    expect(read('pages/matches/past.vue')).toContain('Send a note')
    expect(read('pages/matches/past.vue')).toContain('Ask to reconnect')
    expect(pastApi).toContain('reconnect_interest.id as "reconnectInterestId"')
    expect(pastApi).toContain('di.created_at>m.ended_at')
    expect(read('pages/matches/past.vue')).toContain('Reconnect request pending')
    expect(read('pages/matches/past.vue')).toContain('View sent request')
    expect(read('pages/matches/past.vue')).toContain('connection.apologySent && !connection.reconnectInterestId')
    expect(pastApi).toContain('apology_received.message as "apologyReceivedMessage"')
    expect(pastApi).toContain('incoming_reconnect.id as "incomingReconnectInterestId"')
    expect(read('pages/matches/past.vue')).toContain('Note received from {{ connection.name }}')
    expect(read('pages/matches/past.vue')).toContain('Review reconnect request')
    expect(read('pages/matches/past.vue')).toContain('You chose not to reconnect')
    expect(read('server/api/matches/[id]/apology.post.ts')).toContain('created_at>$3')
    expect(read('server/api/matches/[id]/apology.post.ts')).toContain('for update')
    expect(read('docs/migrations/20260820_allow_repeat_second_chances.sql')).toContain(
      'drop constraint if exists match_apology_notes_match_id_sender_id_key',
    )
  })

  it('does not let the unmatched person contact past a rejection or renew interest', () => {
    const pastApi = read('server/api/matches/past.get.ts')
    const contactApi = read('server/api/matches/[id]/contact.post.ts')
    const interestService = read('server/services/interests/InterestService.ts')
    const interestRepository = read('server/repositories/interests.ts')
    const matchRepository = read('server/repositories/matches.ts')
    const pastPage = read('pages/matches/past.vue')
    expect(pastApi).toContain('as "wasUnmatched"')
    expect(pastApi).toContain('m.ended_by is not null and m.ended_by<>$1')
    expect(pastApi).not.toContain('as "contactSent"')
    expect(contactApi).toContain('statusCode: 410')
    expect(contactApi).not.toContain('match_apology_notes')
    expect(contactApi).not.toContain("'match_contact'")
    expect(pastPage).not.toContain('(private message, not an apology)')
    expect(pastPage).not.toContain('Send this message before re-offering interest')
    expect(pastPage).toContain('Ask to reconnect')
    expect(interestRepository).toContain('m.ended_by=$1')
    expect(interestRepository).not.toContain("man.message_type='contact'")
    expect(interestService).toContain('This connection was ended by the other person')
    expect(interestRepository.indexOf("resolution='expired',resolved_at=now()"))
      .toBeLessThan(interestRepository.indexOf('select count(*)::int as count'))
    expect(matchRepository).toContain('di.sender_id is distinct from ended.ended_by')
    expect(read('server/api/interests/received.get.ts')).toContain('di.sender_id is distinct from ended.ended_by')
    expect(read('docs/migrations/20260907_tighten_second_chances.sql')).toContain("resolution='expired'")
  })

  it('keeps a mutual post-date ending closed instead of creating a contact loophole', () => {
    const pastApi = read('server/api/matches/past.get.ts')
    const profileApi = read('server/api/profiles/[slug].get.ts')
    const contactApi = read('server/api/matches/[id]/contact.post.ts')
    const receivedApi = read('server/api/interests/received.get.ts')
    expect(pastApi).toContain('m.ended_by is not null and m.ended_by<>$1')
    expect(profileApi).toContain("relationship.status='unmatched' and relationship.ended_by is distinct from $2")
    expect(profileApi).not.toContain("man.message_type='contact'")
    expect(contactApi).toContain('statusCode: 410')
    expect(receivedApi).toContain('di.sender_id is distinct from ended.ended_by')
    expect(read('server/api/matches/index.get.ts')).toContain('interest_inbox_state')
    const profilePage = read('pages/profiles/[slug].vue')
    expect(profilePage).toContain("profile.relationshipStatus !== 'unmatched' && isTodaysChoice(profileSlug)")
    expect(profilePage).toContain('@click="sendProfileInterest"')
    expect(profilePage).toContain('interestSent: true')
    expect(read('composables/useDailyInterest.ts')).not.toContain('replaceTodaysInterest')
  })

  it('does not describe a private post-date closure as the other person ending it', () => {
    const pastApi = read('server/api/matches/past.get.ts')
    const page = read('pages/matches/past.vue')
    expect(pastApi).toContain('m.ended_by is not null and m.ended_by<>$1')
    expect(page).toContain("if (connection.endedReason === 'post_date') return 'Closed after your post-date check-in'")
    expect(page).toContain('You ended this connection')
    expect(page).toContain('The other person ended this connection')
    expect(page).not.toContain('ended this match')
  })
})
