import { describe, expect, it } from 'vitest'
import {
  getTaroKeyProgress,
  getTaroKeyXpCost,
  getTaroKeysEarned,
} from '../config/unlock/unlock-config'

describe('taro key XP progression', () => {
  it('uses 20 non-linear XP levels from 100 XP up to the 1000 XP cap', () => {
    expect(Array.from({ length: 23 }, (_, index) => getTaroKeyXpCost(index + 1))).toEqual([
      100,
      125,
      155,
      190,
      230,
      275,
      325,
      380,
      440,
      505,
      575,
      650,
      725,
      795,
      855,
      905,
      945,
      975,
      995,
      1000,
      1000,
      1000,
      1000,
    ])
  })

  it('earns keys from cumulative non-linear XP thresholds', () => {
    expect(getTaroKeysEarned(99)).toBe(0)
    expect(getTaroKeysEarned(100)).toBe(1)
    expect(getTaroKeysEarned(224)).toBe(1)
    expect(getTaroKeysEarned(225)).toBe(2)
    expect(getTaroKeysEarned(799)).toBe(4)
    expect(getTaroKeysEarned(800)).toBe(5)
    expect(getTaroKeysEarned(11144)).toBe(19)
    expect(getTaroKeysEarned(11145)).toBe(20)
    expect(getTaroKeysEarned(12145)).toBe(21)
  })

  it('reports progress toward the next non-linear key cost', () => {
    expect(getTaroKeyProgress(100)).toMatchObject({
      creditsEarned: 1,
      xpNeededForNextTaroKey: 125,
      xpTowardsNextKey: 0,
      xpUntilNextKey: 125,
    })

    expect(getTaroKeyProgress(175)).toMatchObject({
      creditsEarned: 1,
      xpNeededForNextTaroKey: 125,
      xpTowardsNextKey: 75,
      xpUntilNextKey: 50,
    })

    expect(getTaroKeyProgress(11145)).toMatchObject({
      creditsEarned: 20,
      xpNeededForNextTaroKey: 1000,
      xpTowardsNextKey: 0,
      xpUntilNextKey: 1000,
    })
  })
})
