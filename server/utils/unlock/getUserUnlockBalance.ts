import { db } from "~/server/repositories/db"
import { getTaroKeysEarned } from "~/config/unlock/unlock-config"

export type UnlockBalance = {
  totalXp: number
  creditsEarned: number
  creditsSpent: number
  creditsAvailable: number
}

export async function getUserUnlockBalance(userId: string): Promise<UnlockBalance> {
  const statsResult = await db.query(
    `
    select total_xp
    from user_stats
    where user_id = $1
    limit 1
    `,
    [userId]
  )

  const totalXp = Number(statsResult.rows[0]?.total_xp ?? 0)
  const creditsEarned = getTaroKeysEarned(totalXp)

  const spentResult = await db.query(
    `
    select coalesce(sum(cost_credits), 0)::int as spent
    from user_word_unlocks
    where user_id = $1
      and unlock_source = 'xp_credit'
    `,
    [userId]
  )

  const creditsSpent = Number(spentResult.rows[0]?.spent ?? 0)
  const creditsAvailable = Math.max(0, creditsEarned - creditsSpent)

  return {
    totalXp,
    creditsEarned,
    creditsSpent,
    creditsAvailable,
  }
}
