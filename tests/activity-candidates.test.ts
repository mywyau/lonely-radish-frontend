import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('real activity candidates', () => {
  it('loads profiles that selected the corresponding catalogue activity', () => {
    const api = read('server/api/activities/[slug]/people.get.ts')
    expect(api).toContain('from profile_activities pa join activities a')
    expect(api).toContain('p.user_id<>$2')
    expect(api).toContain("m.status='active'")
    expect(api).toContain('interestSent: person.interestSent === true')
    const page = read('pages/activities/[slug].vue')
    expect(page).toContain('databasePeople.value')
    expect(page).toContain('showInterest(person.slug, person.name)')
    expect(page).toContain('person.interestSent || atMatchLimit')
    expect(page).toContain("person.interestSent ? 'Interest already sent'")
  })
})
