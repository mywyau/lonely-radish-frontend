import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('scalable discovery filtering', () => {
  it('stores only approximate geocoded profile locations', () => {
    const migration = read('docs/migrations/20260803_add_approximate_profile_locations.sql')
    const endpoint = read('server/api/profile/location.put.ts')
    const geocoder = read('server/utils/geocodePostcode.ts')
    expect(migration).toContain('extensions.geography(point, 4326)')
    expect(migration).toContain('using gist(location)')
    expect(endpoint).not.toContain('OPENCAGE_API_KEY')
    expect(geocoder).toContain('process.env.OPENCAGE_API_KEY')
    expect(geocoder).toContain('no_record: 1')
    expect(endpoint).toContain('postcode_area=$2')
    expect(endpoint).toContain('$4::numeric as latitude')
    expect(endpoint).toContain('coordinates.latitude::double precision')
    expect(endpoint).not.toContain('returning latitude')
  })

  it('applies the viewing users age, gender, ethnicity and distance filters on the server', () => {
    const filters = read('server/utils/discoveryFilters.ts')
    const discovery = read('server/api/activities/[slug]/people.get.ts')
    expect(filters).toContain('between')
    expect(filters).toContain('mine.interested_genders')
    expect(filters).not.toContain('theirs.interested_genders')
    expect(filters).toContain('mine.preferred_ethnicities')
    expect(filters).not.toContain('theirs.preferred_ethnicities')
    expect(filters).toContain('extensions.ST_DWithin')
    expect(discovery).toContain('viewerDiscoveryWhere')
    expect(discovery).toContain('distanceKm')
  })

  it('offers location controls in onboarding and match preferences', () => {
    expect(read('pages/onboarding.vue')).toContain("'/api/profile/location'")
    expect(read('pages/preferences/index.vue')).toContain('UK postcode')
    expect(read('.env.example')).toContain('OPENCAGE_API_KEY=')
  })
})
