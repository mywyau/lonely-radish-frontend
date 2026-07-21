import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('sent interest feedback and history', () => {
  it('confirms a successful interest immediately', () => {
    const composable = read('composables/useDailyInterest.ts')
    expect(composable).toContain('Interest sent to ${profileName}')
    expect(composable).toContain("const sending = useState<boolean>")
    expect(read('pages/activities/[slug].vue')).toContain('View sent interests')
  })

  it('lists persisted interests and match outcomes', () => {
    const api = read('server/api/interests/sent.get.ts')
    expect(api).toContain('from daily_interests di join profiles p')
    expect(api).toContain('matched.status as "matchStatus"')
    expect(api).toContain("ended: row.matchStatus === 'unmatched'")
    const page = read('pages/interests/sent.vue')
    expect(page).toContain("'/api/interests/sent'")
    expect(page).toContain("interest.ended ? 'Match ended' : 'Interest sent'")
    expect(page).toContain("interest.ended ? '/matches/past'")
    expect(page).toContain('DailyInterestCounter')
  })

  it('prevents sending interest to the same person twice', () => {
    const api = read('server/api/interests/index.post.ts')
    expect(api).toContain('You have already sent interest to this person')
    expect(read('server/api/profiles/[slug].get.ts')).toContain('as "interestSent"')
    expect(read('pages/profiles/[slug].vue')).toContain('Interest already sent')
    const migration = read('docs/migrations/20260723_prevent_duplicate_interests.sql')
    expect(migration).toContain('daily_interests_sender_recipient_unique')
  })
})
