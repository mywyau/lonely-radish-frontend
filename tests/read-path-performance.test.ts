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

  it('loads candidates and the viewer filter summary with one endpoint query', () => {
    const discovery = read('server/api/activities/[slug]/people.get.ts')
    expect(discovery.match(/db\.query/g)).toHaveLength(1)
    expect(discovery).toContain('from profiles viewer left join match_preferences mine')
    expect(discovery).toContain('left join lateral (select p.slug')
    expect(discovery).not.toContain('Promise.all')
  })
})
