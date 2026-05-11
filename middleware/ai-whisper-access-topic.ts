import { getPleaseSignInRedirect } from "~/utils/auth/signInRedirect";
import { canAccessTopicWord, freeTopics } from "~/utils/topics/permissions";

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return; // middleware runs on client only

  const topicSlug = to.params.topic as string | undefined;
  const wordIdSlug = to.params.word as string | undefined;

  if (!topicSlug || !wordIdSlug) return;

  const { isLoggedIn, isLoggedOut, entitlement, resolve } = useMeStateV2();

  await resolve();

  if (isLoggedOut.value) {
    return navigateTo(getPleaseSignInRedirect(to));
  }

  // ✅ Fully free topics
  if (freeTopics.has(topicSlug)) {
    return;
  }

  // ✅ Paid users → full access
  if (canAccessTopicWord(isLoggedIn.value, entitlement.value, topicSlug)) {
    return;
  }

  // 🔓 Free preview logic (first 10 words only)

  const topic = await $fetch(`/api/index/topics/${topicSlug}`);

  const allWords = Object.values(topic.categories).flat();
  
  const freePreviewIds = allWords.slice(0, 10).map((w: any) => w.id);

  if (freePreviewIds.includes(wordIdSlug)) {
    return; // allow preview
  }

  // ❌ Otherwise block
  return navigateTo("/upgrade");
});
