import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const slug = text(objectBody(await readBody(event)).profileSlug, 'Profile', 80, true)
  const client = await db.connect()
  try {
    await client.query('begin')
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [sub])
    const target = await client.query(`select p.user_id,p.display_name from profiles p join users u on u.id=p.user_id
      where p.slug=$1 and p.user_id<>$2 and p.visibility='active' and u.account_status='active'
      and not exists(select 1 from blocks b where
        (b.blocker_id=$2 and b.blocked_id=p.user_id) or (b.blocker_id=p.user_id and b.blocked_id=$2)) for update`, [slug,sub])
    if (!target.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
    const recipientId = target.rows[0].user_id
    const existingMatch = await client.query(`select 1 from matches where status='active' and
      ((user_one_id=$1 and user_two_id=$2) or (user_one_id=$2 and user_two_id=$1)) limit 1`, [sub,recipientId])
    if (existingMatch.rows[0]) throw createError({ statusCode: 409, statusMessage: 'You have already matched with this person' })
    const existingInterest = await client.query(`select 1 from daily_interests
      where sender_id=$1 and recipient_id=$2 limit 1`, [sub,recipientId])
    if (existingInterest.rows[0]) throw createError({ statusCode: 409, statusMessage: 'You have already sent interest to this person' })
    const allowance = await client.query(`select count(*)::int as count from daily_interests di join users u on u.id=di.sender_id
      where di.sender_id=$1 and di.sender_day=(now() at time zone coalesce(u.timezone,'UTC'))::date`, [sub])
    if ((allowance.rows[0]?.count || 0) >= 5) throw createError({ statusCode: 409, statusMessage: 'You have reached today’s limit of 5 interests' })
    const inserted = await client.query(`insert into daily_interests(sender_id,recipient_id,sender_day)
      select $1,$2,(now() at time zone coalesce(timezone,'UTC'))::date from users where id=$1
      returning sender_day as date`, [sub,recipientId])
    const reverse = await client.query('select 1 from daily_interests where sender_id=$1 and recipient_id=$2 limit 1', [recipientId,sub])
    let matched = false
    if (reverse.rows[0]) {
      const [one,two] = [sub,recipientId].sort()
      const created = await client.query(`insert into matches(user_one_id,user_two_id) values($1,$2)
        on conflict(user_one_id,user_two_id) do update set status='active' returning id`, [one,two])
      await client.query(`insert into notifications(recipient_id,actor_id,match_id,kind) values
        ($1,$2,$3,'new_match'),($2,$1,$3,'new_match')`, [sub,recipientId,created.rows[0].id])
      matched = true
    }
    await client.query('commit')
    return { interest: { profileSlug: slug, profileName: target.rows[0].display_name, date: inserted.rows[0].date }, matched }
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23514') throw createError({ statusCode: 409, statusMessage: 'One of you already has five active matches' })
    if ((error as { code?: string; constraint?: string }).code === '23505') {
      const constraint = (error as { constraint?: string }).constraint
      throw createError({ statusCode: 409, statusMessage: constraint === 'daily_interests_sender_recipient_unique'
        ? 'You have already sent interest to this person' : 'You have reached today’s limit of 5 interests' })
    }
    throw error
  } finally { client.release() }
})
