import type { PoolClient } from 'pg'

export async function blockUser(client: PoolClient, blockerId: string, blockedId: string) {
  const pair = [blockerId, blockedId].sort().join(':')
  await client.query('select pg_advisory_xact_lock(hashtext($1))', [pair])
  await client.query(`insert into blocks(blocker_id,blocked_id) values($1,$2)
    on conflict(blocker_id,blocked_id) do nothing`, [blockerId,blockedId])
  const matches = await client.query(`update matches set status='blocked',ended_by=$1,ended_at=coalesce(ended_at,now())
    where status='active' and ((user_one_id=$1 and user_two_id=$2) or (user_one_id=$2 and user_two_id=$1))
    returning id`, [blockerId,blockedId])
  await client.query(`update date_proposals set status='cancelled',updated_at=now()
    where status in ('pending','accepted') and ((inviter_id=$1 and invitee_id=$2) or (inviter_id=$2 and invitee_id=$1))`, [blockerId,blockedId])
  await client.query(`delete from daily_interests
    where (sender_id=$1 and recipient_id=$2) or (sender_id=$2 and recipient_id=$1)`, [blockerId,blockedId])
  await client.query(`delete from notifications
    where (recipient_id=$1 and actor_id=$2) or (recipient_id=$2 and actor_id=$1)`, [blockerId,blockedId])
  return { newlyBlocked: (matches.rowCount || 0) > 0 }
}
