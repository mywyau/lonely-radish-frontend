import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('real activity candidates', () => {
  it('loads profiles that selected any detailed interest in a broad discovery category', () => {
    const api = read('server/api/activities/[slug]/people.get.ts')
    expect(api).toContain('array_agg(coalesce(a.name,pa.custom_label)')
    expect(api).toContain('a.category=any($1::text[])')
    expect(api).toContain('pa.custom_category=any($1::text[])')
    expect(api).toContain('activityTags: person.activityTags || []')
    expect(api).toContain('p.user_id<>$2')
    expect(api).toContain("m.status='active'")
    expect(api).toContain('interestSent: person.interestSent === true')
    const page = read('pages/activities/[slug].vue')
    expect(page).toContain('databasePeople.value')
    expect(page).toContain('showInterest(person.slug, person.name)')
    expect(page).toContain('person.interestSent || atMatchLimit')
    expect(page).toContain("person.interestSent ? 'Interest already sent'")
    expect(page).toContain('broader category')
    expect(page).toContain('person.activityTags')
    expect(page).toContain('Load more people')
    expect(api).toContain('racialPreferencesApplied')
    expect(page).toContain('Applied discovery filters')
    expect(page).toContain('Ages {{ appliedFilters.minimumAge }}–{{ appliedFilters.maximumAge }}')
    expect(page).toContain('Within {{ appliedFilters.distance }} km')
    expect(page).toContain('No profiles match these filters yet')
    expect(page).toContain('Adjust match preferences')
  })

  it('supports wellness, nightlife, exploration and community discovery', () => {
    const discovery = read('utils/activityDiscovery.ts')
    const activities = read('pages/activities/index.vue')
    const preferences = read('pages/preferences/activities.vue')
    for (const category of ['Wellness','Nightlife','Explore','Community']) {
      expect(discovery).toContain(`name: '${category}'`)
      expect(activities).toContain(`name: '${category}'`)
      expect(preferences).toContain(`name: '${category}'`)
    }
    expect(read('docs/migrations/20260811_add_activity_discovery_categories.sql')).toContain("('Wellness','Yoga')")
  })
})
