import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('blocking and reporting', () => {
  it('blocks atomically and closes shared product state without notifying the blocked user', () => {
    const helper = read('server/utils/blockUser.ts')
    expect(helper).toContain("insert into blocks(blocker_id,blocked_id)")
    expect(helper).toContain("set status='blocked'")
    expect(helper).toContain("set status='cancelled'")
    expect(helper).toContain('delete from daily_interests')
    expect(helper).toContain('delete from notifications')
    expect(helper).not.toContain('insert into notifications')
  })

  it('stores moderation-ready reports and can block in the same transaction', () => {
    const endpoint = read('server/api/profiles/[slug]/report.post.ts')
    expect(endpoint).toContain('insert into reports')
    expect(endpoint).toContain('if (alsoBlock) await blockUser')
    expect(endpoint).toContain("category === 'safety' ? 1")
    expect(read('docs/migrations/20260724_safety_moderation.sql')).toContain('reports_status_created_idx')
  })

  it('offers safety actions from a profile and excludes blocked relationships', () => {
    expect(read('pages/profiles/[slug].vue')).toContain('ProfileSafetyActions')
    expect(read('components/ProfileSafetyActions.vue')).toContain('Report profile')
    expect(read('components/ProfileSafetyActions.vue')).toContain('Block user')
    expect(read('components/ProfileSafetyActions.vue')).toContain('border-t border-[#E8D8C4]')
    expect(read('server/api/profiles/[slug].get.ts')).toContain('not exists(select 1 from blocks')
    expect(read('server/api/activities/[slug]/people.get.ts')).toContain('not exists(select 1 from blocks')
    expect(read('server/api/interests/index.post.ts')).toContain('not exists(select 1 from blocks')
  })
})
