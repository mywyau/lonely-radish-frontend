import { createError } from "h3";
import { FREE_LEVEL_WORD_LIMIT } from "~/config/level/levels-config";
import { db } from "~/server/repositories/db";
import { getTaroKeysEarned } from "~/config/unlock/unlock-config";
import { getUnlockedWordIdsForUser } from "~/server/services/cache/wordUnlockCache";
import { requireUser } from "~/server/utils/requireUser";
import { Entitlement } from "~/types/auth/entitlements";
import { isLevelId, levelIdToNumbers } from "~/utils/levels/levels";
import {
  canAccessLevel,
  isComingSoon,
  isFreeLevel,
} from "~/utils/levels/permissions";

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug as string | undefined;

  if (!slug || !isLevelId(slug)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Level not found",
    });
  }

  const levelNumber = levelIdToNumbers(slug);

  if (isComingSoon(levelNumber)) {
    return {
      slug,
      levelNumber,
      isFree: false,
      isComingSoon: true,
      hasFullAccess: false,
      freePreviewIds: [],
      unlockedWordIds: [],
      totalXp: 0,
      creditsEarned: 0,
      creditsSpent: 0,
      creditsAvailable: 0,
    };
  }

  const level = await $fetch<{
    id?: string;
    title: string;
    description: string;
    categories: Record<string, Array<{ id: string }>>;
  }>(`/api/index/levels/${slug}`);

  const allWordIds = Object.values(level.categories)
    .flat()
    .map((word) => word.id)
    .filter(Boolean);

  const freePreviewIds = allWordIds.slice(0, FREE_LEVEL_WORD_LIMIT);

  if (isFreeLevel(levelNumber)) {
    return {
      slug,
      levelNumber,
      isFree: true,
      isComingSoon: false,
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

    const entitlement = await getUserEntitlement(userId!);
    entitlementValue = entitlement;
  } catch {
    userId = null;
    entitlementValue = null;
  }

  const hasFullAccess =
    !!userId && canAccessLevel(Boolean(userId), entitlementValue);

  if (hasFullAccess) {
    const statsResult = await db.query<{ total_xp: number | null }>(
      `
      select total_xp
      from user_stats
      where user_id = $1
      limit 1
      `,
      [userId],
    );

    const spentResult = await db.query<{ spent: number | null }>(
      `
      select coalesce(sum(cost_credits), 0)::int as spent
      from user_word_unlocks
      where user_id = $1
        and unlock_source = 'xp_credit'
      `,
      [userId],
    );

    const totalXp = Number(statsResult.rows[0]?.total_xp ?? 0);
    const creditsEarned = getTaroKeysEarned(totalXp);
    const creditsSpent = Number(spentResult.rows[0]?.spent ?? 0);
    const creditsAvailable = Math.max(0, creditsEarned - creditsSpent);

    return {
      slug,
      levelNumber,
      isFree: false,
      isComingSoon: false,
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
      levelNumber,
      isFree: false,
      isComingSoon: false,
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
    levelNumber,
    isFree: false,
    isComingSoon: false,
    hasFullAccess: false,
    freePreviewIds,
    unlockedWordIds,
    totalXp,
    creditsEarned,
    creditsSpent,
    creditsAvailable,
  };
});
