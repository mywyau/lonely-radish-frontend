export const sexualOrientationOptions = [
  { value: 'straight', label: 'Straight' },
  { value: 'gay', label: 'Gay' },
  { value: 'lesbian', label: 'Lesbian' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'pansexual', label: 'Pansexual' },
  { value: 'asexual', label: 'Asexual' },
  { value: 'queer', label: 'Queer' },
  { value: 'questioning', label: 'Questioning' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

export const sexualOrientationValues = sexualOrientationOptions.map(option => option.value)

export const sexualOrientationPreferenceOptions = [
  { value: 'heterosexual', label: 'Heterosexual', orientations: ['straight'] },
  { value: 'homosexual', label: 'Homosexual', orientations: ['gay', 'lesbian'] },
  { value: 'other', label: 'Other', orientations: ['bisexual', 'pansexual', 'asexual', 'queer', 'questioning', 'prefer_not_to_say'] },
] as const

export const sexualOrientationPreferenceValues = sexualOrientationPreferenceOptions.map(option => option.value)

export function expandSexualOrientationPreferences(values: string[]) {
  const expanded = values.flatMap((value) => {
    const group = sexualOrientationPreferenceOptions.find(option => option.value === value)
    if (group) return [...group.orientations]
    return sexualOrientationValues.includes(value as typeof sexualOrientationValues[number]) ? [value] : []
  })
  return [...new Set(expanded)]
}

export function groupSexualOrientationPreferences(values: string[]) {
  return sexualOrientationPreferenceOptions
    .filter(option => option.orientations.some(orientation => values.includes(orientation)))
    .map(option => option.value)
}
