import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('daily interest allowance', () => {
  it('allows up to five profile choices against the local calendar date', () => {
    const source = readFileSync(resolve(process.cwd(), 'composables/useDailyInterest.ts'), 'utf8')

    expect(source).toContain("const storageKey = 'lonely-radish-daily-interest'")
    expect(source).toContain('const dailyInterestLimit = 5')
    expect(source).toContain('todaysInterests.value.length >= dailyInterestLimit')
    expect(source).toContain('activeMatchCount.value >= 5')
    expect(source).toContain('date: localDateKey()')
    expect(source).toContain('window.localStorage.setItem')
    expect(source).toContain('window.confirm(`Show interest in ${profileName}?')
    expect(source).toContain('remainingAfterSend')
    expect(readFileSync(resolve(process.cwd(), 'components/DailyInterestCounter.vue'), 'utf8')).toContain('of {{ limit }} sent today')
  })
})
