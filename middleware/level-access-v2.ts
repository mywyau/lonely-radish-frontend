import { getPleaseSignInRedirect } from "~/utils/auth/signInRedirect";
import { isLevelId, levelIdToNumbers } from "@/utils/levels/levels";
import { isComingSoon, isFreeLevel } from "~/utils/levels/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  const slug = to.params.slug as string | undefined;
  if (!slug) return;

  const { isLoggedOut, resolve } = useMeStateV2();
  await resolve();

  if (isLoggedOut.value) {
    return navigateTo(getPleaseSignInRedirect(to));
  }

  if (!isLevelId(slug)) {
    throw createError({ statusCode: 404 });
  }

  const levelNumber = levelIdToNumbers(slug);

  if (isFreeLevel(levelNumber)) {
    return;
  }

  if (isComingSoon(levelNumber)) {
    return navigateTo("/coming-soon");
  }
});