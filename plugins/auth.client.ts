export default defineNuxtPlugin(async () => {
  const me = useMeStateV2()
  await me.resolve()
  const refreshOnReturn = () => {
    if (document.visibilityState === 'visible') void me.refreshIfStale()
  }
  document.addEventListener('visibilitychange', refreshOnReturn)
  window.addEventListener('focus', refreshOnReturn)
})
