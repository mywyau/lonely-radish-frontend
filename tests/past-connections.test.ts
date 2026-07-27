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
    expect(page).toContain('Send a message and reconnect')
    expect(page).toContain("`/api/matches/${connection.id}/apology`")
    expect(api).toContain('match_apology_notes')
    expect(page).toContain('lonely-radish-preview-rejected-match')
    expect(page).toContain("query: { connection: 'past' }")
    expect(page).toContain('View unmatched profile')
    expect(page).toContain('Load more past connections')
    expect(read('pages/matches/index.vue')).toContain("localStorage.setItem('lonely-radish-preview-rejected-match'")
  })

  it('allows a fresh apology-led second chance after every ended match', () => {
    const profileApi = read('server/api/profiles/[slug].get.ts')
    const interestApi = read('server/api/interests/index.post.ts')
    const acceptApi = read('server/api/interests/[id]/accept.post.ts')
    const profilePage = read('pages/profiles/[slug].vue')
    expect(profileApi).toContain('"secondChanceAvailable"')
    expect(profileApi).toContain('man.created_at>relationship.ended_at')
    expect(interestApi).toContain('Send a private note before asking for a second chance')
    expect(interestApi).toContain("set status='active',matched_at=now()")
    expect(interestApi).toContain('delete from date_proposals where match_id=$1')
    expect(acceptApi).toContain("set status='active',matched_at=now()")
    expect(acceptApi).toContain('delete from date_proposals where match_id=$1')
    expect(profilePage).toContain('Show interest in ${profile.name} again')
    expect(profilePage).toContain('the other person still chooses whether to accept')
    expect(profilePage).toContain("profile.relationshipStatus === 'unmatched' && !profile.interestSent && !isTodaysChoice(profileSlug)")
    expect(profilePage).toContain('You have re-offered interest to {{ profile.name }}')
    expect(profilePage).not.toContain('one-time second chance')
    expect(read('pages/matches/past.vue')).toContain('Send a message and reconnect')
    expect(read('pages/matches/past.vue')).toContain('Re-offer interest')
    expect(read('server/api/matches/[id]/apology.post.ts')).toContain('created_at>$3')
    expect(read('server/api/matches/[id]/apology.post.ts')).toContain('for update')
    expect(read('docs/migrations/20260820_allow_repeat_second_chances.sql')).toContain(
      'drop constraint if exists match_apology_notes_match_id_sender_id_key',
    )
  })

  it('requires the unmatched person to send a neutral message before renewing interest', () => {
    const pastApi = read('server/api/matches/past.get.ts')
    const contactApi = read('server/api/matches/[id]/contact.post.ts')
    const interestApi = read('server/api/interests/index.post.ts')
    const acceptApi = read('server/api/interests/[id]/accept.post.ts')
    const pastPage = read('pages/matches/past.vue')
    expect(pastApi).toContain('as "wasUnmatched"')
    expect(pastApi).toContain('as "contactSent"')
    expect(contactApi).toContain('Only the person who was unmatched')
    expect(contactApi).toContain("'match_contact'")
    expect(contactApi).toContain('delete from daily_interests')
    expect(contactApi).toContain("kind='interest_received'")
    expect(pastPage).toContain('(private message, not an apology)')
    expect(pastPage).toContain('does not need to respond')
    expect(pastPage).toContain('Send this message before re-offering interest')
    expect(pastPage).toContain('Re-offer interest')
    expect(interestApi).toContain("m.ended_by<>$1 and man.message_type='contact'")
    expect(interestApi).toContain('Send a private message before re-offering interest')
    expect(acceptApi).toContain("di.sender_id<>ended.ended_by and man.message_type='contact'")
    expect(read('server/api/interests/received.get.ts')).toContain("man.message_type='contact'")
    expect(read('docs/migrations/20260821_add_past_connection_messages.sql')).toContain(
      "check (message_type in ('apology','contact'))",
    )
  })
})
