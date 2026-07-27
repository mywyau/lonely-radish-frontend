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
