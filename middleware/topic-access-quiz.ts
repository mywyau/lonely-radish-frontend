import { getPleaseSignInRedirect } from "~/utils/auth/signInRedirect";
import { isGuestPreviewRoute } from "~/utils/quiz/access";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const topic = to.params.topic as string;
  if (!topic) return;

  const { isLoggedOut, resolve } = useMeStateV2();
  await resolve();

  const allowGuestPreview = isGuestPreviewRoute({
    path: to.path,
    previewRouteMarkers: ["/sentences/", "/vocabulary/"],
  });

  if (isLoggedOut.value && !allowGuestPreview) {
    return navigateTo(getPleaseSignInRedirect(to));
  }
});
