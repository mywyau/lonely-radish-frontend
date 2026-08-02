import { describe, expect, it, vi } from 'vitest'
import {
  ensureTimesFitSharedAvailability,
  fitsAvailability,
  sharedAvailabilitySuggestions,
  type AvailabilityWindow,
} from '../server/utils/proposalAvailability'

const threeEvenings: AvailabilityWindow[] = [0,1,2].map(weekday => ({
  weekday,
  startTime: '18:00',
  endTime: '22:00',
}))

describe('shared planning suggestions', () => {
  it('returns the first shared one-hour option on three different days', () => {
    const suggestions = sharedAvailabilitySuggestions({
      viewerWindows: threeEvenings,
      viewerTimeZone: 'Europe/London',
      matchWindows: [0,1,2].map(weekday => ({ weekday, startTime: '19:00', endTime: '21:00' })),
      matchTimeZone: 'Europe/London',
      now: new Date('2026-08-03T08:00:00.000Z'),
    })

    expect(suggestions).toEqual([
      '2026-08-03T18:00:00.000Z',
      '2026-08-04T18:00:00.000Z',
      '2026-08-05T18:00:00.000Z',
    ])
  })

  it('compares each weekly schedule in its own time zone', () => {
    const suggestions = sharedAvailabilitySuggestions({
      viewerWindows: [{ weekday: 0, startTime: '10:00', endTime: '13:00' }],
      viewerTimeZone: 'America/Los_Angeles',
      matchWindows: [{ weekday: 0, startTime: '18:00', endTime: '21:00' }],
      matchTimeZone: 'Europe/London',
      now: new Date('2026-08-03T08:00:00.000Z'),
      limit: 1,
    })

    expect(suggestions).toEqual(['2026-08-03T17:00:00.000Z'])
  })

  it('returns no suggestions unless both members configured an overlapping schedule', () => {
    expect(sharedAvailabilitySuggestions({
      viewerWindows: [{ weekday: 0, startTime: '09:00', endTime: '10:00' }],
      viewerTimeZone: 'Europe/London',
      matchWindows: [{ weekday: 0, startTime: '18:00', endTime: '20:00' }],
      matchTimeZone: 'Europe/London',
      now: new Date('2026-08-03T07:00:00.000Z'),
    })).toEqual([])

    expect(sharedAvailabilitySuggestions({
      viewerWindows: [],
      viewerTimeZone: 'Europe/London',
      matchWindows: threeEvenings,
      matchTimeZone: 'Europe/London',
    })).toEqual([])
  })

  it('requires a complete hour inside a configured window', () => {
    const windows = [{ weekday: 0, startTime: '18:00', endTime: '20:00' }]
    expect(fitsAvailability(new Date('2026-08-03T18:00:00.000Z'), windows, 'Europe/London')).toBe(true)
    expect(fitsAvailability(new Date('2026-08-03T18:30:00.000Z'), windows, 'Europe/London')).toBe(false)
  })

  it('rejects a proposal when the database says either configured schedule does not fit', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ allFit: false }] })
    await expect(ensureTimesFitSharedAvailability({ query }, ['member-a','member-b'], [
      new Date('2026-08-03T18:00:00.000Z'),
    ])).rejects.toThrow('Choose a time that fits both of your usual schedules')
    expect(query).toHaveBeenCalledOnce()
    expect(query.mock.calls[0][1][0]).toEqual(['member-a','member-b'])
  })
})
