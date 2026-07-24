export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || to.path === '/business/sign-in') return
  const { isLoggedIn,resolve } = useMeStateV2()
  await resolve()
  if (!isLoggedIn.value) return navigateTo({ path:'/business/sign-in',query:{ redirect:to.fullPath } })
})
