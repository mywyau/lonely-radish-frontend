import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('notification centre', () => {
  it('shows notification history and supports read controls', () => {
    const page = read('pages/notifications.vue')
    expect(page).toContain('/api/notifications?includeRead=true')
    expect(page).toContain('Mark all read')
    expect(page).toContain('View update')
    expect(page).toContain('Delete this notification permanently?')
    expect(page).toContain("method: 'DELETE'")
    expect(read('components/BlankNavBar.vue')).toContain("to: '/notifications'")
  })

  it('creates notifications throughout the match lifecycle', () => {
    expect(read('server/api/interests/index.post.ts')).toContain("'new_match'")
    expect(read('server/api/proposals/index.post.ts')).toContain("'proposal_received'")
    expect(read('server/api/proposals/[id].put.ts')).toContain("'proposal_updated'")
    expect(read('server/api/proposals/[id]/respond.post.ts')).toContain("'date_confirmed'")
    expect(read('server/api/dates/[id]/follow-up.post.ts')).toContain("'follow_up_ready'")
  })

  it('only deletes notifications owned by the signed-in recipient', () => {
    const remove = read('server/api/notifications/[id].delete.ts')
    expect(remove).toContain('recipient_id=$2')
    expect(remove).toContain('Notification not found')
  })
})
