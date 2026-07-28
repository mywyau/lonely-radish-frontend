export const sexualOrientationOptions = [
  { value: 'straight', label: 'Straight' },
  { value: 'gay', label: 'Gay' },
  { value: 'lesbian', label: 'Lesbian' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'another_orientation', label: 'Another orientation' },
] as const

export const sexualOrientationValues = sexualOrientationOptions.map(option => option.value)

export const sexualOrientationPreferenceOptions = sexualOrientationOptions

export const sexualOrientationPreferenceValues = sexualOrientationPreferenceOptions.map(option => option.value)

export function expandSexualOrientationPreferences(values: string[]) {
  return [...new Set(values.filter(value =>
    sexualOrientationValues.includes(value as typeof sexualOrientationValues[number]),
  ))]
}

export function groupSexualOrientationPreferences(values: string[]) {
  return expandSexualOrientationPreferences(values)
}
