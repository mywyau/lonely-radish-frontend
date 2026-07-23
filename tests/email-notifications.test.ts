import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('email notifications', () => {
  it('queues notification emails transactionally with preferences and retries', () => {
    const migration = read('docs/migrations/20260805_add_email_notifications.sql')
    expect(migration).toContain('email_notification_preferences')
    expect(migration).toContain('email_deliveries')
    expect(migration).toContain('notifications_queue_email')
    expect(migration).toContain("'interest_received'")
  })

  it('sends through Resend without exposing credentials', () => {
    const sender = read('server/utils/notificationEmail.ts')
    expect(sender).toContain('process.env.RESEND_API_KEY')
    expect(sender).toContain('https://api.resend.com/emails')
    expect(sender).toContain('Idempotency-Key')
    expect(sender).toContain('List-Unsubscribe')
    expect(sender).toContain('A thoughtful update')
    expect(sender).toContain('Take things at your pace.')
    expect(sender).toContain('role="presentation"')
    expect(sender).toContain('emailDestination')
    expect(sender).toContain("status='failed'")
  })

  it('offers user-controlled email categories', () => {
    const page = read('pages/notifications.vue')
    expect(page).toContain('Email notifications')
    expect(page).toContain("'/api/email/preferences'")
    expect(page).toContain('New interests')
    expect(page).toContain('Post-date check-ins')
    expect(page).toContain('emailPreferencesCollapsed')
    expect(page).toContain(':aria-expanded="!emailPreferencesCollapsed"')
    expect(page).toContain('v-show="!emailPreferencesCollapsed"')
  })
})
