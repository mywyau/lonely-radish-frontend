import { getPleaseSignInRedirect } from "~/utils/auth/signInRedirect";

export default defineNuxtRouteMiddleware((to) => {
  const {
    isLoggedIn,
    isLoggedOut,
    resolve,
  } = useMeStateV2();

  if (isLoggedOut.value) {
    return navigateTo(getPleaseSignInRedirect(to));
  }

  if (!isLoggedIn.value) {
    return resolve();
  }

  if (isLoggedIn.value) {
    return;
  } else {
    return navigateTo(getPleaseSignInRedirect(to));
  }
});
