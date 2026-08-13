import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('notification centre', () => {
  it('shows notification history and supports read controls', () => {
    const page = read('pages/notifications.vue')
    expect(page).toContain("'/api/notifications'")
    expect(page).toContain('Load more notifications')
    expect(page).toContain('Mark all read')
    expect(page).toContain('View update')
    expect(page).toContain('Delete this notification permanently?')
    expect(page).toContain("method: 'DELETE'")
    expect(read('components/BlankNavBar.vue')).toContain("to: '/notifications'")
    expect(read('components/BlankNavBar.vue')).not.toContain("'/api/navigation/counts'")
    expect(read('components/BlankNavBar.vue')).toContain('unreadNotificationCount: unreadCount')
    expect(page).toContain('setUnreadNotificationCount')
    expect(page).toContain('adjustUnreadNotificationCount')
  })

  it('creates notifications throughout the match lifecycle', () => {
    expect(read('server/services/interests/InterestService.ts')).toContain("'new_match'")
    expect(read('server/services/interests/InterestService.ts')).toContain("'interest.sent'")
    expect(read('server/services/outbox/OutboxProcessor.ts')).toContain('insert into notifications')
    expect(read('server/api/proposals/[id]/send.post.ts')).toContain("'proposal_received'")
    expect(read('server/api/proposals/[id].put.ts')).toContain("'proposal_updated'")
    expect(read('server/api/proposals/[id]/respond.post.ts')).toContain("'date_confirmed'")
    expect(read('server/api/dates/[id]/follow-up.post.ts')).toContain("'follow_up_ready'")
    expect(read('server/api/matches/[id]/apology.post.ts')).toContain("'match_apology'")
    expect(read('server/api/matches/[id]/contact.post.ts')).toContain('statusCode: 410')
    expect(read('pages/notifications.vue')).toContain('sent you a note and may ask to reconnect')
    // Historical contact notifications remain readable even though no new ones can be created.
    expect(read('pages/notifications.vue')).toContain('sent you a private message')
  })

  it('presents earlier updates as a secondary ordered, collapsible timeline', () => {
    const page = read('pages/matches/index.vue')
    expect(page).toContain('Earlier updates')
    expect(page).toContain('A history of recent changes to your connections and plans.')
    expect(page).toContain('notificationGroups')
    expect(page).toContain('notificationDayLabel')
    expect(page).toContain('Show {{ hiddenNotificationCount }} older')
    expect(page).toContain('Full history')
    expect(page).toContain("'/api/notifications/read-all'")
    expect(page.indexOf('v-for="section in sections"')).toBeLessThan(page.indexOf('Earlier updates'))
    expect(page).not.toContain('You have a new match or date-plan update.')
  })

  it('only deletes notifications owned by the signed-in recipient', () => {
    const remove = read('server/api/notifications/[id].delete.ts')
    expect(remove).toContain('recipient_id=$2')
    expect(remove).toContain('Notification not found')
  })

  it('deletes all notifications owned by the user after confirmation', () => {
    const page = read('pages/notifications.vue')
    const removeAll = read('server/api/notifications/all.delete.ts')
    expect(page).toContain('Delete all notifications?')
    expect(page).toContain('role="alertdialog"')
    expect(page).toContain('showDeleteAllConfirmation')
    expect(page).not.toContain("window.confirm('Delete all notifications")
    expect(page).toContain("'/api/notifications/all'")
    expect(page).toContain('>Delete all</button>')
    expect(removeAll).toContain('delete from notifications where recipient_id=$1')
    expect(removeAll).toContain('requireUser')
  })
})
