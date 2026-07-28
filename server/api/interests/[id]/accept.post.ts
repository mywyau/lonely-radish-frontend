import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { activateMatchOrQueue } from '~/server/utils/matchQueue'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const client = await db.connect()
  try {
    await client.query('begin')
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [`match-momentum:${sub}`])
    const pendingAction = await client.query(`select 1 from matches where status='active'
      and action_required_by=$1 and action_completed_at is null limit 1`, [sub])
    if (pendingAction.rows[0]) {
      throw createError({ statusCode: 409, statusMessage: 'Take action on your current new match before accepting another interest' })
    }
    const incoming = await client.query(`select di.sender_id,p.slug,p.display_name from daily_interests di
      join profiles p on p.user_id=di.sender_id join users u on u.id=di.sender_id
      where di.id=$1 and di.recipient_id=$2 and di.declined_at is null and p.visibility='active' and (u.account_status='active' or
        (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now()))
      and not exists(select 1 from matches ended where ended.status='unmatched'
        and ((ended.user_one_id=$2 and ended.user_two_id=di.sender_id) or (ended.user_two_id=$2 and ended.user_one_id=di.sender_id))
        and (di.created_at<=ended.ended_at or not exists(select 1 from match_apology_notes man
          where man.match_id=ended.id and man.sender_id=di.sender_id and man.created_at>ended.ended_at
            and ((di.sender_id=ended.ended_by and man.message_type='apology')
              or (di.sender_id is distinct from ended.ended_by and man.message_type='contact'))))) for update`, [id,sub])
    if (!incoming.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Received interest not found' })
    const senderId = incoming.rows[0].sender_id
    const pair = [sub,senderId].sort()
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [pair.join(':')])
    const blocked = await client.query(`select 1 from blocks where
      (blocker_id=$1 and blocked_id=$2) or (blocker_id=$2 and blocked_id=$1) limit 1`, [sub,senderId])
    if (blocked.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Received interest not found' })
    const existing = await client.query(`select id,status from matches where user_one_id=$1 and user_two_id=$2`, pair)
    if (existing.rows[0]?.status === 'active') throw createError({ statusCode: 409, statusMessage: 'You are already matched' })
    if (existing.rows[0]?.status === 'queued') throw createError({ statusCode: 409, statusMessage: 'This match is already queued' })
    const match = existing.rows[0]
      ? await client.query(`update matches set status='queued',matched_at=now(),ended_by=null,ended_reason=null,ended_at=null,
          action_required_by=$2,action_completed_at=null
          where id=$1 returning id`, [existing.rows[0].id,sub])
      : await client.query(`insert into matches(user_one_id,user_two_id,status,action_required_by)
          values($1,$2,'queued',$3) returning id`, [...pair,sub])
    if (existing.rows[0]?.status === 'unmatched') {
      await client.query('delete from date_proposals where match_id=$1', [match.rows[0].id])
    }
    const activated = await activateMatchOrQueue(client, match.rows[0].id)
    const notificationKind = activated ? 'new_match' : 'match_queued'
    await client.query(`insert into notifications(recipient_id,actor_id,match_id,kind) values
      ($1,$2,$3,$4),($2,$1,$3,$4)`, [sub,senderId,match.rows[0].id,notificationKind])
    await client.query('commit')
    return { matched: true, queued: !activated, matchId: match.rows[0].id,
      slug: incoming.rows[0].slug, name: incoming.rows[0].display_name }
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23514') throw createError({ statusCode: 409, statusMessage: 'One of you has reached their active match limit' })
    throw error
  } finally { client.release() }
})
