import { getPleaseSignInRedirect } from "~/utils/auth/signInRedirect";
import { isLevelId, levelIdToNumbers } from "@/utils/levels/levels";
import { isComingSoon } from "~/utils/levels/permissions";
import { isGuestPreviewRoute } from "~/utils/quiz/access";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const slug = to.params.slug as string;
  if (!slug) return;

  const { isLoggedOut, resolve } = useMeStateV2();
  await resolve();

  if (!isLevelId(slug)) {
    throw createError({ statusCode: 404 });
  }

  const levelNumber: number = levelIdToNumbers(slug);
  const allowGuestPreview = isGuestPreviewRoute({
    path: to.path,
    previewRouteMarkers: ["/sentences/", "/word/", "/audio/"],
  });

  if (isLoggedOut.value && !allowGuestPreview) {
    return navigateTo(getPleaseSignInRedirect(to));
  }

  if (isComingSoon(levelNumber)) {
    return navigateTo("/coming-soon");
  }
});
