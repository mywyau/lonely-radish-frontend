export type MockProfile = {
  firstName: string
  lastName: string
  activity: string
  availability: string
}

const defaultProfile: MockProfile = {
  firstName: 'Johnathan',
  lastName: 'Ball',
  activity: 'Gallery walk',
  availability: 'Thu evenings, Sat mornings',
}

const storageKey = 'lonely-radish-profile'

export function useMockProfile() {
  const profile = useState<MockProfile>('mock-profile', () => ({ ...defaultProfile }))
  const loaded = useState<boolean>('mock-profile-loaded', () => false)

  function loadProfile() {
    if (!import.meta.client || loaded.value) return
    loaded.value = true

    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return

    try {
      const parsed = JSON.parse(stored) as Partial<MockProfile>
      profile.value = {
        firstName: typeof parsed.firstName === 'string' ? parsed.firstName : defaultProfile.firstName,
        lastName: typeof parsed.lastName === 'string' ? parsed.lastName : defaultProfile.lastName,
        activity: typeof parsed.activity === 'string' ? parsed.activity : defaultProfile.activity,
        availability: typeof parsed.availability === 'string' ? parsed.availability : defaultProfile.availability,
      }
    } catch {
      window.localStorage.removeItem(storageKey)
    }
  }

  function saveProfile() {
    if (import.meta.client) {
      window.localStorage.setItem(storageKey, JSON.stringify(profile.value))
    }
  }

  return { profile, loadProfile, saveProfile }
}
