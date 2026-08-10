import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('schedule and safety preferences', () => {
  it('stores structured weekday time ranges on a dedicated page', () => {
    const page = read('pages/preferences/schedule.vue')
    expect(page).toContain("title: 'Schedule & Safety · Lonely Radish'")
    expect(page).toContain("'/api/preferences/schedule'")
    expect(page).toContain('type="time"')
    expect(page).toContain('Only suggest public places')
    expect(page).toContain('Let people see this before you match')
    expect(page).toContain('resetAvailability')
    expect(page).toContain('Reset all')
    expect(read('server/api/profiles/[slug].get.ts')).toContain(
      "on relationship.status='active' or coalesce(mp.availability_visible_before_match,false)",
    )
    expect(read('server/api/activities/[slug]/people.get.ts')).not.toContain('from availability')
    expect(read('server/api/preferences/schedule.put.ts')).toContain("startTime >= endTime")
  })

  it('shows a match schedule while organising a date', () => {
    expect(read('server/api/planning/[slug].get.ts')).toContain('from availability')
    expect(read('server/api/planning/[slug].get.ts')).toContain('sharedAvailabilitySuggestions')
    expect(read('pages/plans/[slug].vue')).toContain('When {{ personName }} is usually free')
    expect(read('pages/plans/[slug].vue')).toContain('Times that fit both schedules')
    expect(read('pages/preferences/index.vue')).toContain('to="/preferences/schedule"')
  })
})
