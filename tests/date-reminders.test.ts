import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('confirmed date reminders and attendance', () => {
  it('creates idempotent 24-hour and 2-hour reminders', () => {
    const migration = read('docs/migrations/20260809_add_date_reminders_and_attendance.sql')
    const processor = read('server/utils/dateReminders.ts')
    expect(migration).toContain('primary key (proposal_id, reminder_type)')
    expect(migration).toContain("'date_reminder_24h'")
    expect(migration).toContain("'date_reminder_2h'")
    expect(processor).toContain("interval '24 hours'")
    expect(processor).toContain("interval '2 hours'")
    expect(processor).toContain('on conflict do nothing')
  })

  it('secures the reminder processor with QStash signatures', () => {
    const endpoint = read('server/api/reminders/process.post.ts')
    expect(endpoint).toContain("'upstash-signature'")
    expect(endpoint).toContain('QSTASH_CURRENT_SIGNING_KEY')
    expect(endpoint).toContain('receiver.verify')
    expect(endpoint).toContain('processDateReminders')
  })

  it('lets either participant confirm, reschedule, or cancel', () => {
    const endpoint = read('server/api/proposals/[id]/attendance.post.ts')
    const page = read('pages/matches/index.vue')
    expect(endpoint).toContain("['confirm','reschedule','cancel']")
    expect(endpoint).toContain("status='draft'")
    expect(endpoint).toContain("status='cancelled'")
    expect(endpoint).toContain("'date_attendance_confirmed'")
    expect(endpoint).toContain("'date_reschedule_requested'")
    expect(endpoint).toContain("'date_cancelled'")
    expect(page).toContain('Still going?')
    expect(page).toContain("updateAttendance(match, 'confirm')")
    expect(page).toContain("updateAttendance(match, 'reschedule')")
    expect(page).toContain("updateAttendance(match, 'cancel')")
    expect(read('pages/plans/[slug].vue')).toContain('Choose another date and time')
  })

  it('sends the new updates through existing email preferences', () => {
    const email = read('server/utils/notificationEmail.ts')
    expect(email).toContain("date_reminder_24h: 'date_plans'")
    expect(email).toContain("date_reminder_2h: 'date_plans'")
    expect(email).toContain("date_cancelled: 'date_plans'")
  })
})
