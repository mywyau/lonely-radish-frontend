import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('private date reliability', () => {
  it('stores post-date outcomes and gives reported users 48 hours to respond', () => {
    const migration = read('docs/migrations/20260813_add_date_reliability.sql')
    expect(migration).toContain("outcome in ('happened','cancelled','no_show')")
    expect(migration).toContain("now()+interval '48 hours'")
    expect(migration).toContain("status in ('pending','confirmed','disputed','dismissed')")
    expect(migration).toContain('revoke all on table date_outcome_responses, date_no_show_cases')
  })

  it('does not automatically penalise disputed reports', () => {
    const response = read('server/api/dates/[id]/outcome-response.post.ts')
    expect(response).toContain("set status='disputed'")
    expect(response).toContain("else await confirmNoShowCase")
    expect(response).toContain("'no_show_disputed'")
  })

  it('uses progressive private discovery restrictions for confirmed patterns', () => {
    const reliability = read('server/utils/dateReliability.ts')
    expect(reliability).toContain("now()+interval '3 days'")
    expect(reliability).toContain("now()+interval '7 days'")
    expect(reliability).toContain("confirmed_no_show_count+1=2")
    expect(read('server/api/activities/people.get.ts')).toContain('u.discovery_restricted_until<=now()')
    expect(read('server/services/interests/InterestService.ts')).toContain('New discovery is temporarily paused')
  })

  it('uses the existing signed reminder worker for prompts and expired cases', () => {
    const reminders = read('server/utils/dateReminders.ts')
    expect(reminders).toContain("'date_outcome_needed'")
    expect(reminders).toContain("response_deadline<=now()")
    expect(reminders).toContain('confirmNoShowCase')
  })

  it('provides private attendance and dispute controls', () => {
    const page = read('pages/dates/[id]/follow-up.vue')
    expect(page).toContain('Did this date happen?')
    expect(page).toContain('They did not attend')
    expect(page).toContain('Dispute report')
    expect(page).toContain('never appear as public profile labels')
    const controls = read('pages/account/controls.vue')
    expect(controls).toContain('Your attendance history')
    expect(controls).toContain('>Private</span>')
  })
})
