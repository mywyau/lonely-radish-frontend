export type ProfileDetailsSource = {
  heightCm?: number | null
  weightKg?: number | null
  drinking?: string | null
  smoking?: string | null
  dailyRhythm?: string | null
}

export type ProfileDetail = { label: string; value: string }

const drinkingLabels: Record<string, string> = {
  never: 'Does not drink',
  socially: 'Drinks socially',
  regularly: 'Drinks regularly',
}

const smokingLabels: Record<string, string> = {
  never: 'Does not smoke',
  socially: 'Smokes socially',
  regularly: 'Smokes regularly',
}

const rhythmLabels: Record<string, string> = {
  early_bird: 'Prefers mornings',
  night_owl: 'Prefers evenings and nights',
  flexible: 'Flexible — mornings or evenings',
}

export function profileDetails(profile: ProfileDetailsSource): ProfileDetail[] {
  const details: ProfileDetail[] = []
  if (profile.heightCm) details.push({ label: 'Height', value: `${profile.heightCm} cm` })
  if (profile.weightKg) details.push({ label: 'Weight', value: `${profile.weightKg} kg` })
  if (profile.drinking && drinkingLabels[profile.drinking]) {
    details.push({ label: 'Drinking', value: drinkingLabels[profile.drinking] })
  }
  if (profile.smoking && smokingLabels[profile.smoking]) {
    details.push({ label: 'Smoking', value: smokingLabels[profile.smoking] })
  }
  if (profile.dailyRhythm && rhythmLabels[profile.dailyRhythm]) {
    details.push({ label: 'Daily rhythm', value: rhythmLabels[profile.dailyRhythm] })
  }
  return details
}
