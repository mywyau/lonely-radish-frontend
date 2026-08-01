import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('admin moderation workflow', () => {
  it('adds auditable and expiring moderation state', () => {
    const migration = read('docs/migrations/20260822_add_moderation_workflow.sql')
    expect(migration).toContain('create table if not exists moderation_actions')
    expect(migration).toContain('moderation_suspended_until')
    expect(migration).toContain('reviewed_by')
    expect(migration).toContain("'suspend_permanent'")
    expect(migration).toContain("'account_suspended'")
  })

  it('provides a protected paginated report queue with safety context', () => {
    const api = read('server/api/admin/reports/index.get.ts')
    expect(api).toContain('requireAdmin(event)')
    expect(api).toContain('decodeCursor')
    expect(api).toContain('pageRows')
    expect(api).toContain('pageSize = 25')
    expect(api).toContain('"previousReportCount"')
    expect(api).toContain('"reporterSubmissionCount"')
    expect(api).toContain('"reporterBlockedUser"')
    expect(api).toContain('"relatedDateCount"')
  })

  it('audits decisions and protects privileged accounts', () => {
    const api = read('server/api/admin/reports/[id].patch.ts')
    expect(api).toContain('requireAdmin(event)')
    expect(api).toContain('moderation_actions')
    expect(api).toContain('You cannot take moderation action against your own account')
    expect(api).toContain("report.role !== 'member'")
    expect(api).toContain("decision === 'suspend_7_days'")
    expect(api).toContain("decision === 'suspend_30_days'")
    expect(api).toContain("decision === 'suspend_permanent'")
  })

  it('enforces suspensions and restores expired temporary suspensions', () => {
    const guard = read('server/utils/requireUser.ts')
    expect(guard).toContain("account_status='suspended'")
    expect(guard).toContain('moderation_suspended_until<=now()')
    expect(guard).toContain('ACCOUNT_SUSPENDED')
    expect(guard).toContain("'auto_restore'")
    expect(read('pages/account/suspended.vue')).toContain('Your account is suspended')
  })

  it('renders the admin queue and navigation entry', () => {
    const page = read('pages/admin/moderation.vue')
    expect(page).toContain("middleware: 'admin'")
    expect(page).toContain('Safety moderation')
    expect(page).toContain('Recent reports against this member')
    expect(page).toContain('Private resolution note')
    expect(page).toContain('Suspend permanently')
    expect(page).toContain('Load more reports')
    expect(read('components/BlankNavBar.vue')).toContain("to: '/admin/moderation'")
  })

  it('queues destructive member deletion with explicit confirmation and a durable audit', () => {
    const api = read('server/api/admin/users/[id].delete.ts')
    const service = read('server/services/accountDeletion.ts')
    const page = read('pages/admin/moderation.vue')
    const migration = read('docs/migrations/20260902_add_admin_account_deletion.sql')
    expect(api).toContain('requireAdmin(event)')
    expect(api).toContain('confirmEmail')
    expect(api).toContain('membersOnly: true')
    expect(api).toContain('retryFailed: true')
    expect(service).toContain('You cannot delete your own account')
    expect(service).toContain("requestSource: options.source")
    expect(page).toContain('Permanently delete account')
    expect(page).toContain('Confirm permanent deletion')
    expect(page).toContain('deletionReasons[report.id]')
    expect(read('pages/admin/users.vue')).toContain('Retry failed deletion')
    expect(read('server/api/admin/users/index.get.ts')).toContain('requireAdmin(event)')
    expect(read('server/api/admin/users/index.get.ts')).toContain('pageRows')
    expect(read('components/BlankNavBar.vue')).toContain("to: '/admin/users'")
    expect(migration).toContain('requested_by')
    expect(migration).toContain('request_source')
    expect(migration).toContain('request_reason')
  })

  it('sends compulsory account safety notifications', () => {
    const email = read('server/utils/notificationEmail.ts')
    expect(email).toContain('moderation_warning')
    expect(email).toContain('account_suspended')
    expect(email).toContain('account_restored')
    expect(email).toContain('setting == null ? true')
  })
})
