import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('approximate public locations', () => {
  it('keeps distance filtering private and returns a rough location label', () => {
    const discovery = read('server/api/activities/[slug]/people.get.ts')
    expect(discovery).toContain('coalesce(p.location_label,p.postcode_area,p.neighbourhood) as place')
    expect(discovery).not.toContain('`${person.distanceKm} km away`')
    expect(read('server/api/profiles/[slug].get.ts')).toContain('coalesce(p.location_label,p.postcode_area,p.neighbourhood) as place')
  })

  it('does not render per-person distance on discovery or profile pages', () => {
    expect(read('pages/activities/[slug].vue')).not.toContain('person.distance')
    expect(read('pages/profiles/[slug].vue')).not.toContain('profile.distance')
  })
})
