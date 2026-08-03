export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || to.path.startsWith('/business') || to.path === '/please-sign-in') return
  const { resolve, isLoggedIn, accountType } = useMeStateV2()
  await resolve()
  if (isLoggedIn.value && accountType.value === 'business') return navigateTo('/business')
})
