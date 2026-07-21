export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;
  const { isLoggedIn, resolve } = useMeStateV2();
  await resolve();
  if (!isLoggedIn.value) return navigateTo({ path: "/please-sign-in", query: { redirect: to.fullPath } });
  const onboardingPhotoSetup = to.path === "/photos" && to.query.onboarding === "1";
  if (to.path !== "/onboarding" && !onboardingPhotoSetup) {
    const onboarding = await $fetch<{ complete: boolean }>("/api/onboarding/status");
    if (!onboarding.complete) return navigateTo({ path: "/onboarding", query: { redirect: to.fullPath } });
  }
});
