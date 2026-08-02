export const openRaceEthnicityPreferenceLabel = 'Open to all backgrounds'

export const raceEthnicityOptions = [
  'Asian',
  'Black',
  'Latin American',
  'Middle Eastern or North African',
  'White',
  'Mixed or multiple backgrounds',
  'Indigenous',
  'Another racial or ethnic background',
  'Prefer not to say',
] as const

export type RaceEthnicity = typeof raceEthnicityOptions[number]

export const raceEthnicitySelfDescriptionLimit = 100

export function isRaceEthnicity(value: string): value is RaceEthnicity {
  return raceEthnicityOptions.includes(value as RaceEthnicity)
}

export function usesRaceEthnicitySelfDescription(value: string) {
  return value === 'Another racial or ethnic background'
}
