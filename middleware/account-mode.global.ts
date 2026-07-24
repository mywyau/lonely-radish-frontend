export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || to.path.startsWith('/business') || to.path === '/please-sign-in') return
  try {
    const mode = await $fetch<{ accountType: string }>('/api/account/mode')
    if (mode.accountType === 'business') return navigateTo('/business')
  } catch {
    // Public and signed-out routes remain available.
  }
})
