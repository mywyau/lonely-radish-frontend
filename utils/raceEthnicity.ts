export const openRaceEthnicityPreferenceLabel = 'Open to all backgrounds'

export const raceEthnicityOptions = [
  'Asian',
  'Black',
  'African',
  'Caribbean',
  'Latin American',
  'Middle Eastern',
  'North African',
  'White',
  'Mixed ethnicity',
  'Indigenous',
  'Pacific Islander',
  'Another ethnic background',
  'Prefer to self-describe',
] as const

export type RaceEthnicity = typeof raceEthnicityOptions[number]

export const raceEthnicitySelfDescriptionLimit = 100

export function isRaceEthnicity(value: string): value is RaceEthnicity {
  return raceEthnicityOptions.includes(value as RaceEthnicity)
}

export function usesRaceEthnicitySelfDescription(value: string) {
  return value === 'Prefer to self-describe'
}
