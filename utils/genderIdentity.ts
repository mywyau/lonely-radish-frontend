export const genderIdentityOptions = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'neither', label: 'Non-binary / another identity' },
] as const

export type GenderIdentity = typeof genderIdentityOptions[number]['value']

export const genderIdentityValues = genderIdentityOptions.map(option => option.value)

export function isGenderIdentity(value: string): value is GenderIdentity {
  return genderIdentityValues.includes(value as GenderIdentity)
}

export function genderIdentityLabel(value?: string | null) {
  return genderIdentityOptions.find(option => option.value === value)?.label || ''
}
