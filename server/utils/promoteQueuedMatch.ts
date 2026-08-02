import type { DatabaseClient } from '~/server/repositories/db'
import { activateMatchOrQueue } from '~/server/utils/matchQueue'

export type PromotedMatch = {
  id: string
  userOneId: string
  userTwoId: string
}

export async function promoteOldestEligibleQueuedMatch(
  client: DatabaseClient,
  userId: string,
): Promise<PromotedMatch | null> {
  await client.query('select pg_advisory_xact_lock(hashtext($1))', [`match-promotion:${userId}`])
  const { rows } = await client.query<PromotedMatch>(`select id,
      user_one_id as "userOneId",user_two_id as "userTwoId"
    from matches where status='queued' and (user_one_id=$1 or user_two_id=$1)
    order by matched_at asc,id asc for update`, [userId])

  for (const match of rows) {
    if (!await activateMatchOrQueue(client, match.id)) continue
    await client.query(`delete from notifications where match_id=$1 and kind='match_queued'`, [match.id])
    await client.query(`insert into notifications(recipient_id,actor_id,match_id,kind) values
      ($1,$2,$3,'new_match'),($2,$1,$3,'new_match')`,
    [match.userOneId, match.userTwoId, match.id])
    return match
  }
  return null
}
