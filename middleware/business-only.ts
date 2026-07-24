export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || to.path === '/business/sign-in') return
  const { isLoggedIn,resolve } = useMeStateV2()
  await resolve()
  if (!isLoggedIn.value) return navigateTo({ path:'/business/sign-in',query:{ redirect:to.fullPath } })

  const mode = await $fetch<{ accountType: string; hasBusiness: boolean; sessionMode: string }>('/api/account/mode')
  const isBusinessUser = mode.accountType === 'business' || mode.sessionMode === 'business'

  if (!isBusinessUser) {
    return navigateTo({ path:'/business/sign-in',query:{ redirect:to.fullPath } })
  }

  // The dashboard contains business onboarding. Until it has created the
  // membership record, do not allow deep links into the rest of the portal.
  if (!mode.hasBusiness && to.path !== '/business') {
    return navigateTo({ path:'/business',query:{ onboarding:'required' } })
  }
})
