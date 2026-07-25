export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  try {
    await $fetch('/api/admin/me')
  } catch {
    return navigateTo({ path: '/please-sign-in', query: { redirect: to.fullPath } })
  }
})
