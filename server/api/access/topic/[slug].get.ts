import { createError } from "h3";
import { FREE_WORD_LIMIT } from "~/config/topic/topics-config";
import { db } from "~/server/repositories/db";
import { getUnlockedWordIdsForUser } from "~/server/services/cache/wordUnlockCache";
import { requireUser } from "~/server/utils/requireUser";
import { Entitlement } from "~/types/auth/entitlements";
import { canAccessTopicWord, freeTopics } from "~/utils/topics/permissions";
import { getTaroKeysEarned } from "~/config/unlock/unlock-config";

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug as string | undefined;

  if (!slug) {
    throw createError({
      statusCode: 404,
      statusMessage: "Topic not found",
    });
  }

  let topic: {
    id?: string;
    title: string;
    description: string;
    categories: Record<string, Array<{ id: string }>>;
  };

  try {
    topic = await $fetch(`/api/index/topics/${slug}`);
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Topic not found",
    });
  }

  const allWordIds = Object.values(topic.categories)
    .flat()
    .map((word) => word.id)
    .filter(Boolean);

  const freePreviewIds = allWordIds.slice(0, FREE_WORD_LIMIT);
  const isFree = freeTopics.has(slug);

  if (isFree) {
    return {
      slug,
      topicId: topic.id ?? slug,
      isFree: true,
      hasFullAccess: true,
      freePreviewIds,
      unlockedWordIds: [],
      totalXp: 0,
      creditsEarned: 0,
      creditsSpent: 0,
      creditsAvailable: 0,
    };
  }

  let userId: string | null = null;
  let entitlementValue: Entitlement | null = null;

  try {
    const user = await requireUser(event);
    userId = user.sub ?? null;

    // Adjust this import/function name if your entitlement helper differs.

    const entitlement = await getUserEntitlement(userId!);
    entitlementValue = entitlement;
  } catch {
    userId = null;
    entitlementValue = null;
  }

  const hasFullAccess =
    !!userId && canAccessTopicWord(true, entitlementValue, slug);

  if (hasFullAccess) {
    const [statsResult, spentResult] = await Promise.all([
      db.query<{ total_xp: number | null }>(
        `
        select total_xp
        from user_stats
        where user_id = $1
        limit 1
        `,
        [userId],
      ),
      db.query<{ spent: number | null }>(
        `
        select coalesce(sum(cost_credits), 0)::int as spent
        from user_word_unlocks
        where user_id = $1
          and unlock_source = 'xp_credit'
        `,
        [userId],
      ),
    ]);

    const totalXp = Number(statsResult.rows[0]?.total_xp ?? 0);
    const creditsEarned = getTaroKeysEarned(totalXp);
    const creditsSpent = Number(spentResult.rows[0]?.spent ?? 0);
    const creditsAvailable = Math.max(0, creditsEarned - creditsSpent);

    return {
      slug,
      topicId: topic.id ?? slug,
      isFree: false,
      hasFullAccess: true,
      freePreviewIds,
      unlockedWordIds: [],
      totalXp,
      creditsEarned,
      creditsSpent,
      creditsAvailable,
    };
  }

  if (!userId) {
    return {
      slug,
      topicId: topic.id ?? slug,
      isFree: false,
      hasFullAccess: false,
      freePreviewIds,
      unlockedWordIds: [],
      totalXp: 0,
      creditsEarned: 0,
      creditsSpent: 0,
      creditsAvailable: 0,
    };
  }

  const [statsResult, spentResult, unlockedWordIds] = await Promise.all([
    db.query<{ total_xp: number | null }>(
      `
      select total_xp
      from user_stats
      where user_id = $1
      limit 1
      `,
      [userId],
    ),
    db.query<{ spent: number | null }>(
      `
      select coalesce(sum(cost_credits), 0)::int as spent
      from user_word_unlocks
      where user_id = $1
        and unlock_source = 'xp_credit'
      `,
      [userId],
    ),
    getUnlockedWordIdsForUser(userId, allWordIds),
  ]);

  const totalXp = Number(statsResult.rows[0]?.total_xp ?? 0);
  const creditsEarned = getTaroKeysEarned(totalXp);
  const creditsSpent = Number(spentResult.rows[0]?.spent ?? 0);
  const creditsAvailable = Math.max(0, creditsEarned - creditsSpent);

  return {
    slug,
    topicId: topic.id ?? slug,
    isFree: false,
    hasFullAccess: false,
    freePreviewIds,
    unlockedWordIds,
    totalXp,
    creditsEarned,
    creditsSpent,
    creditsAvailable,
  };
});
