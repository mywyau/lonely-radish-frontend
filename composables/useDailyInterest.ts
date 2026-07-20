export type DailyInterest = {
  profileSlug: string
  profileName: string
  date: string
}

const storageKey = 'lonely-radish-daily-interest'

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useDailyInterest() {
  const interest = useState<DailyInterest | null>('daily-interest', () => null)
  const loaded = useState<boolean>('daily-interest-loaded', () => false)
  const errorMessage = useState<string | null>('daily-interest-error', () => null)

  const todaysInterest = computed(() => interest.value?.date === localDateKey() ? interest.value : null)
  const hasUsedDailyInterest = computed(() => Boolean(todaysInterest.value))

  async function loadInterest() {
    if (!import.meta.client || loaded.value) return
    loaded.value = true

    try {
      const response = await $fetch<{ interest: DailyInterest | null }>('/api/interests/today')
      interest.value = response.interest
      return
    } catch {
      // Keep the local fallback for the three fictional prototype profiles.
    }
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return

    try {
      const parsed = JSON.parse(stored) as Partial<DailyInterest>
      if (typeof parsed.profileSlug === 'string' && typeof parsed.profileName === 'string' && typeof parsed.date === 'string') {
        interest.value = parsed as DailyInterest
      }
    } catch {
      window.localStorage.removeItem(storageKey)
    }
  }

  async function showInterest(profileSlug: string, profileName: string) {
    if (!import.meta.client || hasUsedDailyInterest.value) return false
    errorMessage.value = null
    try {
      const response = await $fetch<{ interest: DailyInterest }>('/api/interests', { method: 'POST', body: { profileSlug } })
      interest.value = response.interest
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status
      if (status === 404 && ['maya', 'nina', 'alex'].includes(profileSlug)) {
        interest.value = { profileSlug, profileName, date: localDateKey() }
      } else {
        errorMessage.value = status === 409 ? 'You have already shown interest in someone today.' : 'We could not save your interest. Please try again.'
        return false
      }
    }
    window.localStorage.setItem(storageKey, JSON.stringify(interest.value))
    return true
  }

  function isTodaysChoice(profileSlug: string) {
    return todaysInterest.value?.profileSlug === profileSlug
  }

  return { todaysInterest, hasUsedDailyInterest, errorMessage, loadInterest, showInterest, isTodaysChoice }
}
