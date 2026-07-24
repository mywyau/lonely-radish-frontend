import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'pages/preferences/activities.vue'), 'utf8')

describe('activity preference accordions', () => {
  it('starts categories collapsed and exposes accessible toggles', () => {
    expect(page).toContain('new Set()')
    expect(page).toContain(':aria-expanded="openGroups.has(group.name)"')
    expect(page).toContain('v-show="openGroups.has(group.name)"')
    expect(page).toContain('selectedInGroup(group.name)')
  })
})
