import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const client = await db.connect()
  try {
    await client.query('begin')
    const incoming = await client.query(`select di.sender_id,p.slug,p.display_name from daily_interests di
      join profiles p on p.user_id=di.sender_id join users u on u.id=di.sender_id
      where di.id=$1 and di.recipient_id=$2 and p.visibility='active' and (u.account_status='active' or
        (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now())) for update`, [id,sub])
    if (!incoming.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Received interest not found' })
    const senderId = incoming.rows[0].sender_id
    const pair = [sub,senderId].sort()
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [pair.join(':')])
    const blocked = await client.query(`select 1 from blocks where
      (blocker_id=$1 and blocked_id=$2) or (blocker_id=$2 and blocked_id=$1) limit 1`, [sub,senderId])
    if (blocked.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Received interest not found' })
    const existing = await client.query(`select status from matches where user_one_id=$1 and user_two_id=$2`, pair)
    if (existing.rows[0]?.status === 'active') throw createError({ statusCode: 409, statusMessage: 'You are already matched' })
    if (existing.rows[0]) throw createError({ statusCode: 409, statusMessage: 'This connection has already ended' })
    const match = await client.query(`insert into matches(user_one_id,user_two_id) values($1,$2) returning id`, pair)
    await client.query(`insert into notifications(recipient_id,actor_id,match_id,kind) values
      ($1,$2,$3,'new_match'),($2,$1,$3,'new_match')`, [sub,senderId,match.rows[0].id])
    await client.query('commit')
    return { matched: true, matchId: match.rows[0].id, slug: incoming.rows[0].slug, name: incoming.rows[0].display_name }
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23514') throw createError({ statusCode: 409, statusMessage: 'One of you already has five active matches' })
    throw error
  } finally { client.release() }
})
