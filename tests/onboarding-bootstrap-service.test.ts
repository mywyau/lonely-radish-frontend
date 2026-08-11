import { describe, expect, it, vi } from 'vitest'
import type { DatabaseQueryable } from '../server/repositories/db'
import { loadOnboardingBootstrap, resolveOnboardingStatus } from '../server/services/onboardingBootstrap'

function querySequence(rows: unknown[][]) {
  const query = vi.fn(async () => {
    const next = rows.shift() || []
    return { rows: next, rowCount: next.length }
  })
  return { database: { query } as DatabaseQueryable, query }
}

describe('onboarding bootstrap service', () => {
  it('loads the complete onboarding form through three typed queries', async () => {
    const { database, query } = querySequence([[
      {
        completedAt: '2026-08-12T08:00:00.000Z', profileUserId: 'member-1',
        profileComplete: true, racialIdentityComplete: true, activityCount: 2, photoCount: 1,
        locationComplete: true, preferencesComplete: true, datingComplete: true, paidAccess: true,
        slug: 'alex-123', displayName: 'Alex', genderIdentity: 'non_binary', sexualOrientation: 'bisexual',
        raceEthnicity: 'Mixed or multiple backgrounds', raceEthnicitySelfDescription: null,
        dateOfBirth: '1992-04-03', pronouns: 'they/them', bio: 'Hello', heightCm: 175,
        weightKg: null, drinking: 'socially', smoking: 'never', dailyRhythm: 'flexible',
        postcodeArea: 'SW1', locationLabel: 'Westminster', distance: 25, minimumAge: 25,
        maximumAge: 42, timing: ['weekends'], publicOnly: true,
        availabilityVisibleBeforeMatch: false, genders: ['woman'], orientations: ['gay', 'lesbian'],
        noOrientationPreference: false, openToEveryone: false, raceEthnicities: [],
        noRaceEthnicityPreference: true,
      },
    ], [
      { name: 'Gallery walks', category: 'Culture', custom: false },
      { name: 'Pottery painting', category: 'Learning', custom: true },
    ], [
      { weekday: 5, startTime: '10:00:00', endTime: '14:00:00' },
    ]])

    const result = await loadOnboardingBootstrap(database, 'member-1')

    expect(query).toHaveBeenCalledTimes(3)
    expect(result.status).toMatchObject({ complete: true, nextStep: 6, activityCount: 2, photoCount: 1 })
    expect(result.profile).toMatchObject({ slug: 'alex-123', displayName: 'Alex', dateOfBirth: '1992-04-03' })
    expect(result.activities).toMatchObject({ selectionLimit: 10 })
    expect(result.activities.selected).toHaveLength(2)
    expect(result.dating.orientations).toEqual(['gay_or_lesbian'])
    expect(result.schedule.windows[0]).toMatchObject({ weekday: 5, startTime: '10:00:00' })
    expect(result.location).toEqual({ postcodeArea: 'SW1', label: 'Westminster', hasLocation: true })
  })

  it('provides safe defaults for a new account without a profile or preferences', async () => {
    const { database } = querySequence([[
      {
        completedAt: null, profileUserId: null, profileComplete: false,
        racialIdentityComplete: false, activityCount: 0, photoCount: 0,
        locationComplete: false, preferencesComplete: false, datingComplete: false,
        paidAccess: false, postcodeArea: null, locationLabel: null,
      },
    ], [], []])

    const result = await loadOnboardingBootstrap(database, 'new-member')

    expect(result.status).toMatchObject({ complete: false, nextStep: 1 })
    expect(result.profile).toBeNull()
    expect(result.activities).toEqual({ selected: [], selectionLimit: 5 })
    expect(result.general).toEqual({ distance: 10, minimumAge: 18, maximumAge: 80, timing: [], publicOnly: true })
    expect(result.dating).toEqual({ genders: [], orientations: [], noOrientationPreference: true,
      openToEveryone: true, raceEthnicities: [], noRaceEthnicityPreference: true })
  })

  it('derives resumable steps from persisted state', () => {
    const base = { completedAt: null, profileComplete: true, racialIdentityComplete: true,
      activityCount: 1, photoCount: 0, locationComplete: true, preferencesComplete: true, datingComplete: false }
    expect(resolveOnboardingStatus(base).nextStep).toBe(5)
    expect(resolveOnboardingStatus({ ...base, datingComplete: true }).nextStep).toBe(6)
  })
})
