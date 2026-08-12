import type { AppBootstrap, Entitlement, MeState, MeUser } from '~/types/auth/entitlements'

const bootstrapMaxAgeMs = 60_000
let pendingResolve: Promise<void> | null = null

export function useMeStateV2() {
  const state = useState<MeState>('meStateV2', () => ({ status: 'loading' }))
  const resolved = useState<boolean>('meResolvedV2', () => false)
  const resolvedAt = useState<number>('meResolvedAtV2', () => 0)

  const resolve = async ({ force = false } = {}) => {
    if (resolved.value && !force) return
    if (import.meta.server) return
    if (pendingResolve) return pendingResolve
    pendingResolve = (async () => {
      const previous = state.value
      if (previous.status !== 'logged-in') state.value = { status: 'loading' }
      try {
        const bootstrap = await $fetch<AppBootstrap>('/api/bootstrap')
        state.value = { status: 'logged-in', user: bootstrap.user, bootstrap }
        resolved.value = true
        resolvedAt.value = Date.now()
      } catch (error: any) {
        const status = error?.statusCode || error?.response?.status || error?.data?.statusCode
        const code = error?.data?.data?.code || error?.data?.code
        if (code === 'ACCOUNT_SUSPENDED' && useRoute().path !== '/account/suspended') {
          state.value = { status: 'logged-out' }
          resolved.value = true
          await navigateTo('/account/suspended')
        } else if (status === 401) {
          state.value = { status: 'logged-out' }
          resolved.value = true
        } else if (previous.status === 'logged-in') {
          state.value = previous
          resolved.value = true
        } else {
          state.value = { status: 'unavailable', message: 'We could not verify your session. Check your connection and try again.' }
          resolved.value = false
        }
      } finally {
        pendingResolve = null
      }
    })()
    return pendingResolve
  }

  const refreshIfStale = async () => {
    if (!resolved.value || Date.now() - resolvedAt.value >= bootstrapMaxAgeMs) await resolve({ force: true })
  }

  function patchBootstrap(patch: Partial<AppBootstrap>) {
    if (state.value.status !== 'logged-in') return
    const bootstrap = { ...state.value.bootstrap, ...patch }
    state.value = { status: 'logged-in', user: bootstrap.user, bootstrap }
  }
  function setMatchCount(value: number) { patchBootstrap({ matchCount: Math.max(0, value) }) }
  function adjustMatchCount(change: number) { setMatchCount(matchCount.value + change) }
  function setUnreadNotificationCount(value: number) { patchBootstrap({ unreadNotificationCount: Math.max(0, value) }) }
  function adjustUnreadNotificationCount(change: number) {
    setUnreadNotificationCount(unreadNotificationCount.value + change)
  }
  function setOnboardingComplete(value = true) { patchBootstrap({ onboardingComplete: value }) }
  function clear() {
    state.value = { status: 'logged-out' }
    resolved.value = true
    resolvedAt.value = Date.now()
  }

  const authReady = computed(() => state.value.status !== 'loading')
  const isLoading = computed(() => state.value.status === 'loading')
  const isLoggedIn = computed(() => state.value.status === 'logged-in')
  const isLoggedOut = computed(() => state.value.status === 'logged-out')
  const isUnavailable = computed(() => state.value.status === 'unavailable')
  const user = computed<MeUser | null>(() => state.value.status === 'logged-in' ? state.value.user : null)
  const bootstrap = computed<AppBootstrap | null>(() => state.value.status === 'logged-in' ? state.value.bootstrap : null)
  const entitlement = computed<Entitlement | null>(() => user.value?.entitlement ?? null)
  const isAdmin = computed(() => bootstrap.value?.isAdmin === true)
  const accountType = computed(() => bootstrap.value?.accountType || 'personal')
  const sessionMode = computed(() => bootstrap.value?.sessionMode || 'personal')
  const hasBusiness = computed(() => bootstrap.value?.hasBusiness === true)
  const onboardingComplete = computed(() => bootstrap.value?.onboardingComplete === true)
  const matchCount = computed(() => bootstrap.value?.matchCount || 0)
  const unreadNotificationCount = computed(() => bootstrap.value?.unreadNotificationCount || 0)
  const activeMatchLimit = computed(() => bootstrap.value?.activeMatchLimit || 5)
  const isCanceling = computed(() => entitlement.value?.cancel_at_period_end === true)
  const currentPeriodEnd = computed<Date | null>(() => entitlement.value?.current_period_end ? new Date(entitlement.value.current_period_end) : null)

  return { state, authReady, isLoading, isLoggedIn, isLoggedOut, isUnavailable, user, bootstrap,
    entitlement, isAdmin, accountType, sessionMode, hasBusiness, onboardingComplete, matchCount,
    unreadNotificationCount, activeMatchLimit, isCanceling, currentPeriodEnd, resolve, refreshIfStale,
    setMatchCount, adjustMatchCount, setUnreadNotificationCount, adjustUnreadNotificationCount,
    setOnboardingComplete, clear }
}
