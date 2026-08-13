export function normalizeDiscoveryPreferences(value: Record<string, unknown> | null | undefined) {
  return {
    minimumAge: typeof value?.minimumAge === 'number' ? value.minimumAge : 18,
    maximumAge: typeof value?.maximumAge === 'number' ? value.maximumAge : 100,
    distance: typeof value?.distance === 'number' ? value.distance : 10,
    openToEveryone: value?.openToEveryone !== false,
    genders: Array.isArray(value?.genders) ? value.genders.filter(item => typeof item === 'string') : [],
    noOrientationPreference: value?.noOrientationPreference !== false,
    orientations: Array.isArray(value?.orientations) ? value.orientations.filter(item => typeof item === 'string') : [],
    noRacePreference: value?.noRacePreference !== false,
    locationLabel: typeof value?.locationLabel === 'string' ? value.locationLabel : null,
    postcodeArea: typeof value?.postcodeArea === 'string' ? value.postcodeArea : null,
  }
}
