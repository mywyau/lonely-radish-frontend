import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('measured read-path query amplification', () => {
  it('loads a viewed profile and its related collections with one endpoint query', () => {
    const profile = read('server/api/profiles/[slug].get.ts')
    expect(profile.match(/db\.query/g)).toHaveLength(1)
    expect(profile).toContain("coalesce(photos.items,'[]'::json)")
    expect(profile).toContain("coalesce(activity_rows.items,'[]'::json)")
    expect(profile).toContain("coalesce(personal_interests.items,'[]'::json)")
    expect(profile).toContain("coalesce(schedule.items,'[]'::json)")
    expect(profile).not.toContain('Promise.all')
  })

  it('loads notification rows and the unread total with one endpoint query', () => {
    const endpoint = read('server/api/notifications.get.ts')
    const notifications = read('server/repositories/notifications.ts')
    expect(endpoint).toContain('listNotifications(db, sub')
    expect(notifications.match(/database\.query/g)).toHaveLength(1)
    expect(notifications).toContain('with notification_page as materialized')
    expect(notifications).toContain('from unread left join notification_page on true')
  })
})
