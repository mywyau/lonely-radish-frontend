import { describe, expect, it } from 'vitest'
import { databasePoolMax } from '../server/repositories/databasePoolConfig'

describe('database pool configuration', () => {
  it('defaults to a conservative per-instance pool of two', () => {
    expect(databasePoolMax({})).toBe(2)
  })

  it('allows a controlled staging increase up to ten', () => {
    expect(databasePoolMax({ DATABASE_POOL_MAX: '8' })).toBe(8)
    expect(databasePoolMax({ DATABASE_POOL_MAX: '10' })).toBe(10)
  })

  it.each(['0', '11', '2.5', 'eight'])('rejects an unsafe value of %s', value => {
    expect(() => databasePoolMax({ DATABASE_POOL_MAX: value })).toThrow(
      'DATABASE_POOL_MAX must be an integer between 1 and 10',
    )
  })
})
