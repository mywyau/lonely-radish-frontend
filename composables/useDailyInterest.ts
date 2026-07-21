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
  const successMessage = useState<string | null>('daily-interest-success', () => null)
  const sending = useState<boolean>('daily-interest-sending', () => false)
  const activeMatchCount = useState<number>('active-match-count', () => 0)

  const todaysInterest = computed(() => interest.value?.date === localDateKey() ? interest.value : null)
  const hasUsedDailyInterest = computed(() => Boolean(todaysInterest.value))
  const atMatchLimit = computed(() => activeMatchCount.value >= 5)

  async function loadInterest() {
    if (!import.meta.client) return
    loaded.value = true
    successMessage.value = null

    try {
      const response = await $fetch<{ interest: DailyInterest | null; activeMatchCount: number }>('/api/interests/today')
      interest.value = response.interest
      activeMatchCount.value = response.activeMatchCount
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
    if (!import.meta.client || hasUsedDailyInterest.value || atMatchLimit.value) return false
    errorMessage.value = null
    successMessage.value = null
    sending.value = true
    try {
      const response = await $fetch<{ interest: DailyInterest; matched?: boolean }>('/api/interests', { method: 'POST', body: { profileSlug } })
      interest.value = response.interest
      if (response.matched) activeMatchCount.value += 1
    } catch (error) {
      const failure = error as { statusCode?: number; response?: { status?: number }; data?: { statusCode?: number; statusMessage?: string } }
      const status = failure.statusCode || failure.response?.status || failure.data?.statusCode
      if (status === 404 && ['maya', 'nina', 'alex'].includes(profileSlug)) {
        interest.value = { profileSlug, profileName, date: localDateKey() }
      } else {
        errorMessage.value = status === 409 && failure.data?.statusMessage?.includes('already sent interest')
          ? 'You have already sent interest to this person.'
          : status === 409 && failure.data?.statusMessage?.includes('already matched')
          ? 'You have already matched with this person.'
          : status === 409 ? 'You have already shown interest in someone today.' : 'We could not save your interest. Please try again.'
        return false
      }
    } finally {
      sending.value = false
    }
    window.localStorage.setItem(storageKey, JSON.stringify(interest.value))
    successMessage.value = `Interest sent to ${profileName}. You can review it in Sent interests.`
    return true
  }

  function isTodaysChoice(profileSlug: string) {
    return todaysInterest.value?.profileSlug === profileSlug
  }

  return { todaysInterest, hasUsedDailyInterest, activeMatchCount, atMatchLimit, errorMessage, successMessage, sending, loadInterest, showInterest, isTodaysChoice }
}
