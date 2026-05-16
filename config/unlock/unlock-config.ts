export const taroKeyXpCostsBeforeCap = [
  100,
  125,
  155,
  190,
  230,
  275,
  325,
  380,
  440,
  505,
  575,
  650,
  725,
  795,
  855,
  905,
  945,
  975,
  995,
  1000,
] as const

export const taroKeyStartingXp = taroKeyXpCostsBeforeCap[0]
export const taroKeyMaxXp = taroKeyXpCostsBeforeCap[taroKeyXpCostsBeforeCap.length - 1]

export const taroKeyXp = taroKeyStartingXp
export const xpNeededForOneTaroKey = taroKeyStartingXp

export function getTaroKeyXpCost(keyNumber: number): number {
  const normalizedKeyNumber = Math.max(1, Math.floor(keyNumber))

  return taroKeyXpCostsBeforeCap[normalizedKeyNumber - 1] ?? taroKeyMaxXp
}

const xpNeededForNonLinearRamp = taroKeyXpCostsBeforeCap.reduce(
  (sum, cost) => sum + cost,
  0,
)

export function getTaroKeysEarned(totalXp: number): number {
  let remainingXp = Math.max(0, Math.floor(totalXp))

  if (remainingXp >= xpNeededForNonLinearRamp) {
    return taroKeyXpCostsBeforeCap.length
      + Math.floor((remainingXp - xpNeededForNonLinearRamp) / taroKeyMaxXp)
  }

  let keysEarned = 0

  for (const cost of taroKeyXpCostsBeforeCap) {
    if (remainingXp < cost) break

    remainingXp -= cost
    keysEarned += 1
  }

  return keysEarned
}

export function getXpNeededForTaroKeys(keyCount: number): number {
  const normalizedKeyCount = Math.max(0, Math.floor(keyCount))
  const nonLinearKeyCount = Math.min(normalizedKeyCount, taroKeyXpCostsBeforeCap.length)
  const nonLinearXp = taroKeyXpCostsBeforeCap
    .slice(0, nonLinearKeyCount)
    .reduce((sum, cost) => sum + cost, 0)
  const cappedXp = Math.max(0, normalizedKeyCount - taroKeyXpCostsBeforeCap.length)
    * taroKeyMaxXp

  return nonLinearXp + cappedXp
}

export function getTaroKeyProgress(totalXp: number) {
  const normalizedTotalXp = Math.max(0, Math.floor(totalXp))
  const creditsEarned = getTaroKeysEarned(normalizedTotalXp)
  const xpSpentOnEarnedKeys = getXpNeededForTaroKeys(creditsEarned)
  const xpNeededForNextTaroKey = getTaroKeyXpCost(creditsEarned + 1)
  const xpTowardsNextKey = normalizedTotalXp - xpSpentOnEarnedKeys
  const xpUntilNextKey = xpNeededForNextTaroKey - xpTowardsNextKey

  return {
    creditsEarned,
    xpNeededForNextTaroKey,
    xpTowardsNextKey,
    xpUntilNextKey,
  }
}
