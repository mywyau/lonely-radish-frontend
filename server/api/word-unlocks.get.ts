import { createError, getQuery } from "h3";
import { getTaroKeysEarned } from "~/config/unlock/unlock-config";
import { db } from "~/server/repositories/db";
import { getUnlockedWordIdsForUser } from "~/server/services/cache/wordUnlockCache";
import { requireUser } from "~/server/utils/requireUser";

function normalizeWordIds(input: unknown): string[] {
  if (typeof input !== "string") return [];

  return Array.from(
    new Set(
      input
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const userId = user.sub;

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: "User id missing",
    });
  }

  const query = getQuery(event);
  const wordIds = normalizeWordIds(query.wordIds);

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
    getUnlockedWordIdsForUser(userId, wordIds),
  ]);

  const totalXp = Number(statsResult.rows[0]?.total_xp ?? 0);
  const creditsEarned = getTaroKeysEarned(totalXp);
  const creditsSpent = Number(spentResult.rows[0]?.spent ?? 0);
  const creditsAvailable = Math.max(0, creditsEarned - creditsSpent);

  return {
    totalXp,
    creditsEarned,
    creditsSpent,
    creditsAvailable,
    unlockedWordIds,
  };
});
