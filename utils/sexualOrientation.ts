export const sexualOrientationOptions = [
  { value: 'straight', label: 'Heterosexual' },
  { value: 'gay', label: 'Gay' },
  { value: 'lesbian', label: 'Lesbian' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'another_orientation', label: 'Another orientation' },
] as const

export const sexualOrientationValues = sexualOrientationOptions.map(option => option.value)

export const sexualOrientationPreferenceOptions = [
  { value: 'straight', label: 'Heterosexual' },
  { value: 'gay_or_lesbian', label: 'Homosexual' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'another_orientation', label: 'Another orientation' },
] as const

export const sexualOrientationPreferenceValues = sexualOrientationPreferenceOptions.map(option => option.value)

export function expandSexualOrientationPreferences(values: string[]) {
  const expanded = values.flatMap(value => value === 'gay_or_lesbian' ? ['gay', 'lesbian'] : [value])
  return [...new Set(expanded.filter(value =>
    sexualOrientationValues.includes(value as typeof sexualOrientationValues[number]),
  ))]
}

export function groupSexualOrientationPreferences(values: string[]) {
  const supported = new Set(values.filter(value =>
    sexualOrientationValues.includes(value as typeof sexualOrientationValues[number]),
  ))
  return sexualOrientationPreferenceOptions
    .filter(option => option.value === 'gay_or_lesbian'
      ? supported.has('gay') || supported.has('lesbian')
      : supported.has(option.value))
    .map(option => option.value)
}
