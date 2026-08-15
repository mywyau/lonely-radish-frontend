import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('sent interest feedback and history', () => {
  it('confirms a successful interest immediately', () => {
    const composable = read('composables/useDailyInterest.ts')
    const profile = read('pages/profiles/[slug].vue')
    expect(composable).toContain('Interest sent to ${profileName}')
    expect(composable).toContain("const sending = useState<boolean>")
    expect(composable).toContain('interests.value.push(normaliseInterest(response.interest))')
    expect(composable).not.toContain('interests.value.filter(interest => interest.profileSlug !== profileSlug)')
    expect(profile).toContain('interestSent: true')
    expect(profile).toContain('interestResolution: null')
    expect(profile).toContain('@click="sendProfileInterest"')
    expect(profile).toContain('View sent interests')
  })

  it('lists persisted interests and match outcomes', () => {
    const api = read('server/api/interests/sent.get.ts')
    expect(api).toContain('from latest_sent di join profiles p')
    expect(api).toContain('partition by di.recipient_id')
    expect(api).toContain('di.recipient_rank=1')
    expect(api).toContain('matched.status as "matchStatus"')
    expect(api).toContain('as "reconnectRequest"')
    expect(api).toContain("row.matchStatus === 'unmatched'")
    expect(api).toContain('row.reconnectRequest !== true')
    expect(api).toContain("queued: row.matchStatus === 'queued'")
    const page = read('pages/interests/sent.vue')
    expect(page).toContain("'/api/interests/sent'")
    expect(page).toContain("if (interest.queued) return 'Matched — waiting for room in both connection lists'")
    expect(page).toContain("interest.matched || interest.queued ? '/matches'")
    expect(page).toContain('DailyInterestCounter')
    expect(page).toContain('If someone does not respond within 14 days')
    expect(page).toContain('the latest outcome with each person')
    expect(page).toContain('Waiting for ${interest.name}')
    expect(page).toContain("return 'Reconnect request sent'")
    expect(page).toContain('after your note')
    expect(page).toContain('Take back')
  })

  it('prevents sending interest to the same person twice', () => {
    const api = read('server/services/interests/InterestService.ts')
    expect(api).toContain('You have already sent interest to this person')
    expect(read('server/api/profiles/[slug].get.ts')).toContain('as "interestSent"')
    expect(read('server/api/profiles/[slug].get.ts')).toContain('latest_sent_interest.resolution as "interestResolution"')
    expect(read('pages/profiles/[slug].vue')).toContain('Interest closed')
    const migration = read('docs/migrations/20260723_prevent_duplicate_interests.sql')
    expect(migration).toContain('daily_interests_sender_recipient_unique')
    const lifecycleMigration = read('docs/migrations/20260915_preserve_second_chance_interest_history.sql')
    expect(lifecycleMigration).toContain('where resolved_at is null')
    expect(lifecycleMigration).not.toContain('delete from daily_interests')
  })
})
