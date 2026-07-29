import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isUkPostcode, normalizeUkPostcode } from '../utils/ukPostcode'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('structured meeting locations', () => {
  it('normalizes and validates common UK postcode formats', () => {
    expect(normalizeUkPostcode('ec2y8ds')).toBe('EC2Y 8DS')
    expect(normalizeUkPostcode(' w1a 1aa ')).toBe('W1A 1AA')
    expect(isUkPostcode('SW1A 1AA')).toBe(true)
    expect(isUkPostcode('not a postcode')).toBe(false)
  })

  it('adds nullable structured columns so existing plans remain readable', () => {
    const migration = read('docs/migrations/20260829_structured_meeting_locations.sql')
    expect(migration).toContain('venue_address text')
    expect(migration).toContain('venue_postcode text')
    expect(migration).toContain('public_venue_confirmed_at timestamptz')
    expect(migration).toContain('date_proposals_venue_postcode_check')
    expect(migration).not.toContain('not null')
  })

  it('requires and normalizes the location on proposal writes', () => {
    for (const endpoint of ['server/api/proposals/index.post.ts', 'server/api/proposals/[id].put.ts']) {
      const source = read(endpoint)
      expect(source).toContain("text(body.venueAddress, 'Public address', 300, true)")
      expect(source).toContain("normalizeUkPostcode(text(body.venuePostcode, 'Postcode', 12, true))")
      expect(source).toContain("badRequest('Enter a valid UK postcode')")
      expect(source).toContain("body.publicVenueConfirmed !== true")
      expect(source).toContain("text(body.meetingPoint ?? body.venueDetails, 'Meeting point', 300)")
    }
  })

  it('shows separate address, postcode, meeting-point, map, and copy controls', () => {
    const page = read('pages/plans/[slug].vue')
    expect(page).toContain('Public address')
    expect(page).toContain('UK postcode')
    expect(page).toContain('Exact meeting point')
    expect(page).toContain('not a private home address')
    expect(page).toContain('https://www.google.com/maps/search/?api=1&query=')
    expect(page).toContain('View on map')
    expect(page).toContain('Copy address')
    expect(page).toContain('navigator.clipboard.writeText')
  })

  it('copies structured locations into reschedule drafts', () => {
    const action = read('server/api/proposals/[id]/attendance.post.ts')
    expect(action).toContain('venue_address,venue_postcode')
    expect(action).toContain('select match_id,$2,$3,activity_label,null,venue,venue_address,venue_postcode')
  })
})
