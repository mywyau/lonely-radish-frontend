import { describe, expect, it } from 'vitest'
import {
  MAX_SOURCE_PHOTO_BYTES,
  MAX_STORED_PHOTO_BYTES,
  MAX_STORED_THUMBNAIL_BYTES,
  scaledDimensions,
} from '../utils/profilePhotoOptimization'

describe('profile photo optimisation', () => {
  it('preserves aspect ratio and never enlarges smaller photos', () => {
    expect(scaledDimensions(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(scaledDimensions(3000, 4000, 480)).toEqual({ width: 360, height: 480 })
    expect(scaledDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('keeps source and stored size budgets explicit', () => {
    expect(MAX_SOURCE_PHOTO_BYTES).toBe(20 * 1024 * 1024)
    expect(MAX_STORED_PHOTO_BYTES).toBe(1024 * 1024)
    expect(MAX_STORED_THUMBNAIL_BYTES).toBe(200 * 1024)
  })

  it('rejects invalid dimensions', () => {
    expect(() => scaledDimensions(0, 600, 1600)).toThrow('dimensions')
  })
})
