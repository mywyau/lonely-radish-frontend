export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || to.path === '/business/sign-in') return
  const { isLoggedIn,resolve,accountType,sessionMode,hasBusiness } = useMeStateV2()
  await resolve()
  if (!isLoggedIn.value) return navigateTo({ path:'/business/sign-in',query:{ redirect:to.fullPath } })

  const isBusinessUser = accountType.value === 'business' || sessionMode.value === 'business'

  if (!isBusinessUser) {
    return navigateTo({ path:'/business/sign-in',query:{ redirect:to.fullPath } })
  }

  // The dashboard contains business onboarding. Until it has created the
  // membership record, do not allow deep links into the rest of the portal.
  if (!hasBusiness.value && to.path !== '/business') {
    return navigateTo({ path:'/business',query:{ onboarding:'required' } })
  }
})
