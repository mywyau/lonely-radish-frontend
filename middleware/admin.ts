export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const { isLoggedIn,isAdmin,isUnavailable,resolve } = useMeStateV2()
  await resolve()
  if (isUnavailable.value) return abortNavigation(createError({ statusCode:503,statusMessage:'Session unavailable' }))
  if (!isLoggedIn.value || !isAdmin.value) {
    return navigateTo({ path: '/please-sign-in', query: { redirect: to.fullPath } })
  }
})
