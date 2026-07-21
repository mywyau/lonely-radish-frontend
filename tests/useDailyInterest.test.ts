import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('daily interest allowance', () => {
  it('stores one profile choice against the local calendar date', () => {
    const source = readFileSync(resolve(process.cwd(), 'composables/useDailyInterest.ts'), 'utf8')

    expect(source).toContain("const storageKey = 'lonely-radish-daily-interest'")
    expect(source).toContain('hasUsedDailyInterest.value || atMatchLimit.value) return false')
    expect(source).toContain('activeMatchCount.value >= 5')
    expect(source).toContain('date: localDateKey()')
    expect(source).toContain('window.localStorage.setItem')
  })
})
