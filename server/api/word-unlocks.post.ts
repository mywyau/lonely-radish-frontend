import { createError, readBody } from "h3";
import { getTaroKeysEarned } from "~/config/unlock/unlock-config";
import { db } from "~/server/repositories/db";
import { addWordUnlockToCache } from "~/server/services/cache/wordUnlockCache";
import { requireUser } from "~/server/utils/requireUser";

type Body = {
  wordId: string;
};

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<Body>(event);

  const userId = user.sub;
  const wordId = body.wordId?.trim();

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: "User id missing",
    });
  }

  if (!wordId) {
    throw createError({
      statusCode: 400,
      statusMessage: "wordId is required",
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Prevent concurrent unlock requests from overspending credits.
    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [userId]);

    const existingResult = await client.query(
      `
      select 1
      from user_word_unlocks
      where user_id = $1
        and word_id = $2
      limit 1
      `,
      [userId, wordId],
    );

    if ((existingResult.rowCount ?? 0) > 0) {
      await client.query("COMMIT");

      try {
        await addWordUnlockToCache(userId, wordId);
      } catch {
        // ignore cache failure; DB is source of truth
      }

      return {
        ok: true,
        alreadyUnlocked: true,
        wordId,
      };
    }

    const statsResult = await client.query<{ total_xp: number | null }>(
      `
      select total_xp
      from user_stats
      where user_id = $1
      limit 1
      `,
      [userId],
    );

    const totalXp = Number(statsResult.rows[0]?.total_xp ?? 0);
    const creditsEarned = getTaroKeysEarned(totalXp);

    const spentResult = await client.query<{ spent: number | null }>(
      `
      select coalesce(sum(cost_credits), 0)::int as spent
      from user_word_unlocks
      where user_id = $1
        and unlock_source = 'xp_credit'
      `,
      [userId],
    );

    const creditsSpent = Number(spentResult.rows[0]?.spent ?? 0);
    const creditsAvailable = Math.max(0, creditsEarned - creditsSpent);

    if (creditsAvailable < 1) {
      throw createError({
        statusCode: 403,
        statusMessage: "Not enough unlock credits",
      });
    }

    const insertResult = await client.query(
      `
      insert into user_word_unlocks (
        user_id,
        word_id,
        unlock_source,
        cost_credits
      )
      values ($1, $2, 'xp_credit', 1)
      on conflict (user_id, word_id) do nothing
      `,
      [userId, wordId],
    );

    if ((insertResult.rowCount ?? 0) === 0) {
      await client.query("COMMIT");

      try {
        await addWordUnlockToCache(userId, wordId);
      } catch {
        // ignore cache failure; DB is source of truth
      }

      return {
        ok: true,
        alreadyUnlocked: true,
        wordId,
        totalXp,
        creditsEarned,
        creditsSpent,
        creditsAvailable,
      };
    }

    await client.query("COMMIT");

    try {
      await addWordUnlockToCache(userId, wordId);
    } catch {
      // ignore cache failure; DB is source of truth
    }

    return {
      ok: true,
      wordId,
      totalXp,
      creditsEarned,
      creditsSpent: creditsSpent + 1,
      creditsAvailable: creditsAvailable - 1,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    throw error;
  } finally {
    client.release();
  }
});
