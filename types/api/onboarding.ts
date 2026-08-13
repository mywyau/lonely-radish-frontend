export interface OnboardingStatusResponse {
  complete: boolean
  completedAt: string | null
  nextStep: 1 | 2 | 3
  profileComplete: boolean
  racialIdentityComplete: boolean
  activityCount: number
  photoCount: number
  preferencesComplete: boolean
  datingComplete: boolean
  locationComplete: boolean
}

export interface OnboardingProfileResponse {
  slug: string
  displayName: string
  genderIdentity: string | null
  sexualOrientation: string | null
  raceEthnicity: string | null
  raceEthnicitySelfDescription: string | null
  dateOfBirth: string | null
  pronouns: string | null
  bio: string | null
  heightCm: number | null
  weightKg: number | null
  drinking: string | null
  smoking: string | null
  dailyRhythm: string | null
}

export interface OnboardingSelectedActivity {
  name: string
  category: string
  custom: boolean
}

export interface OnboardingGeneralPreferences {
  distance: number
  minimumAge: number
  maximumAge: number
  timing: string[]
  publicOnly: boolean
}

export interface OnboardingDatingPreferences {
  genders: string[]
  orientations: string[]
  noOrientationPreference: boolean
  openToEveryone: boolean
  raceEthnicities: string[]
  noRaceEthnicityPreference: boolean
}

export interface OnboardingScheduleWindow {
  weekday: number
  startTime: string
  endTime: string
}

export interface OnboardingBootstrapResponse {
  status: OnboardingStatusResponse
  profile: OnboardingProfileResponse | null
  activities: {
    selected: OnboardingSelectedActivity[]
    selectionLimit: number
  }
  general: OnboardingGeneralPreferences
  dating: OnboardingDatingPreferences
  schedule: {
    windows: OnboardingScheduleWindow[]
    publicOnly: boolean
    availabilityVisibleBeforeMatch: boolean
  }
  location: {
    postcodeArea: string | null
    label: string | null
    hasLocation: boolean
  }
}
