export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;
  const { isLoggedIn, isUnavailable, onboardingComplete, resolve } = useMeStateV2();
  await resolve();
  if (isUnavailable.value) {
    return abortNavigation(createError({
      statusCode: 503,
      statusMessage: "We could not verify your session. Please check your connection and try again.",
    }));
  }
  if (!isLoggedIn.value) return navigateTo({ path: "/please-sign-in", query: { redirect: to.fullPath } });
  const onboardingPhotoSetup = to.path === "/photos" && to.query.onboarding === "1";
  if (to.path !== "/onboarding" && !onboardingPhotoSetup && !onboardingComplete.value) {
    return navigateTo({ path: "/onboarding", query: { redirect: to.fullPath } });
  }
});
