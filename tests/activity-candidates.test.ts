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
    expect(api).toContain('$6::boolean and pa.custom_label is not null')
    expect(api).toContain('category.customOnly === true')
    expect(api).toContain('all_selected."allActivityTags"')
    expect(api).toContain('matchedActivityTags: matchedActivityTags.slice(0, 3)')
    expect(api).toContain('otherActivityTags: otherActivityTags.slice(0, 3)')
    expect(api).toContain('p.user_id<>$2')
    expect(api).toContain("m.status in ('active','queued')")
    const page = read('pages/activities/[slug].vue')
    expect(page).toContain('databasePeople.value')
    expect(page).toContain(":aria-label=\"`View ${person.name}'s profile`\"")
    expect(page).not.toContain('showInterest(person.slug, person.name)')
    expect(page).not.toContain('useDailyInterest()')
    expect(page).toContain('Everyone here chose something in this category')
    expect(page).toContain('person.matchedActivityTags')
    expect(page).toContain('person.otherActivityTags')
    expect(page).toContain('Also interested in')
    expect(page).not.toContain('selected</span>')
    expect(page).not.toContain('{{ person.detail }}')
    expect(page).not.toContain('person.distanceKm')
    expect(page).toContain('Load more people')
    expect(api).toContain('racialPreferencesApplied')
    expect(page).toContain('Applied discovery filters')
    expect(page).toContain('Ages {{ appliedFilters.minimumAge }}–{{ appliedFilters.maximumAge }}')
    expect(page).toContain('Within {{ appliedFilters.distance }} km')
    expect(page).toContain('Using ${appliedFilters.searchLocation}')
    expect(api).toContain('viewer.postcode_area as "postcodeArea"')
    expect(page).toContain('{{ person.place }}')
    expect(page).toContain('Nobody here fits your preferences yet')
    expect(page).toContain('Change preferences')
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
    const refinedIdeas = read('docs/migrations/20260826_refine_activity_date_ideas.sql')
    for (const activity of ['Restaurants', 'Pilates classes', 'Tai chi', 'Sound baths', 'Walking tours', 'Community gardening']) {
      expect(preferences).toContain(`'${activity}'`)
      expect(refinedIdeas).toContain(`'${activity}'`)
    }
  })

  it('separates food and drink from activities members wrote themselves', () => {
    const discovery = read('utils/activityDiscovery.ts')
    const activities = read('pages/activities/index.vue')

    expect(discovery).toContain("'food-drink': { name: 'Food & drink', databaseCategories: ['Food and drink'] }")
    expect(discovery).toContain("'your-ideas': { name: 'Your ideas', databaseCategories: [], customOnly: true }")
    expect(discovery).toContain("casual: 'food-drink'")
    expect(activities).toContain("slug: 'your-ideas', name: 'Your ideas'")
    expect(activities).not.toContain("name: 'Casual'")
  })
})
