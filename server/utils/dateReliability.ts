import type { PoolClient } from 'pg'

export async function confirmNoShowCase(client: PoolClient, caseId: number) {
  const result = await client.query(`select id,accused_user_id as "accusedUserId",reporter_id as "reporterId",proposal_id as "proposalId"
    from date_no_show_cases where id=$1 and status='pending' for update`, [caseId])
  const noShowCase = result.rows[0]
  if (!noShowCase) return null

  const user = await client.query(`update users set
      confirmed_no_show_count=confirmed_no_show_count+1,
      discovery_restricted_until=case
        when confirmed_no_show_count+1>=3 then greatest(coalesce(discovery_restricted_until,now()),now()+interval '7 days')
        when confirmed_no_show_count+1=2 then greatest(coalesce(discovery_restricted_until,now()),now()+interval '3 days')
        else discovery_restricted_until end
    where id=$1 returning confirmed_no_show_count as "confirmedNoShows",
      discovery_restricted_until as "restrictedUntil"`, [noShowCase.accusedUserId])
  await client.query(`update date_no_show_cases set status='confirmed',resolved_at=now() where id=$1`, [caseId])
  const restricted = Boolean(user.rows[0]?.restrictedUntil && new Date(user.rows[0].restrictedUntil) > new Date())
  await client.query(`insert into notifications(recipient_id,actor_id,proposal_id,kind)
    values($1,$2,$3,$4)`, [noShowCase.accusedUserId, noShowCase.reporterId, noShowCase.proposalId,
    restricted ? 'discovery_restricted' : 'no_show_warning'])
  return { ...user.rows[0], restricted }
}
