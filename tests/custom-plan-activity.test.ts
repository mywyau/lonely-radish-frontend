import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('custom date-plan activities', () => {
  it('allows a planner to type an activity outside the match interests', () => {
    const page = read('pages/plans/[slug].vue')
    expect(page).toContain('1. Choose an activity')
    expect(page).toContain('Suggest a different activity')
    expect(page).toContain('v-model="customActivity"')
    expect(page).toContain(':maxlength="activityLimit"')
    expect(page).toContain('@input="updateCustomActivity"')
    expect(page).toContain('Custom activity selected: {{ activity }}')
  })

  it('switches cleanly between listed and custom activities', () => {
    const page = read('pages/plans/[slug].vue')
    expect(page).toContain('@click="chooseListedActivity(option)"')
    expect(page).toContain("customActivity.value = ''")
    expect(page).toContain("activity.value = customActivity.value.trim().replace(/\\s+/g, ' ')")
    expect(page).toContain("activities.value.includes(activity.value) ? '' : activity.value")
  })

  it('uses the existing server-side activity validation without requiring catalogue membership', () => {
    const create = read('server/api/proposals/index.post.ts')
    const update = read('server/api/proposals/[id].put.ts')
    expect(create).toContain("text(body.activity, 'Activity', 100, true)")
    expect(update).toContain("text(body.activity, 'Activity', 100, true)")
    expect(create).not.toContain('profile_activities')
    expect(update).not.toContain('profile_activities')
  })
})
