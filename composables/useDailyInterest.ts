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

  const todaysInterest = computed(() => interest.value?.date === localDateKey() ? interest.value : null)
  const hasUsedDailyInterest = computed(() => Boolean(todaysInterest.value))

  function loadInterest() {
    if (!import.meta.client || loaded.value) return
    loaded.value = true

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

  function showInterest(profileSlug: string, profileName: string) {
    if (!import.meta.client || hasUsedDailyInterest.value) return false

    interest.value = { profileSlug, profileName, date: localDateKey() }
    window.localStorage.setItem(storageKey, JSON.stringify(interest.value))
    return true
  }

  function isTodaysChoice(profileSlug: string) {
    return todaysInterest.value?.profileSlug === profileSlug
  }

  return { todaysInterest, hasUsedDailyInterest, loadInterest, showInterest, isTodaysChoice }
}
