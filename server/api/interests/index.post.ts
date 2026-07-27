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
    const sender = await client.query(`select account_status,paused_until,discovery_restricted_until from users where id=$1 for update`, [sub])
    if (sender.rows[0]?.account_status === 'paused' && (!sender.rows[0].paused_until || new Date(sender.rows[0].paused_until) > new Date())) {
      throw createError({ statusCode: 409, statusMessage: 'Resume your profile before sending new interest' })
    }
    if (sender.rows[0]?.discovery_restricted_until && new Date(sender.rows[0].discovery_restricted_until) > new Date()) {
      throw createError({ statusCode: 409, statusMessage: 'New discovery is temporarily paused on this account' })
    }
    const target = await client.query(`select p.user_id,p.display_name from profiles p join users u on u.id=p.user_id
      where p.slug=$1 and p.user_id<>$2 and p.visibility='active' and (u.account_status='active' or
        (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now()))
      and (u.discovery_restricted_until is null or u.discovery_restricted_until<=now())
      and not exists(select 1 from blocks b where
        (b.blocker_id=$2 and b.blocked_id=p.user_id) or (b.blocker_id=p.user_id and b.blocked_id=$2)) for update`, [slug,sub])
    if (!target.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
    const recipientId = target.rows[0].user_id
    const existingMatch = await client.query(`select 1 from matches where status='active' and
      ((user_one_id=$1 and user_two_id=$2) or (user_one_id=$2 and user_two_id=$1)) limit 1`, [sub,recipientId])
    if (existingMatch.rows[0]) throw createError({ statusCode: 409, statusMessage: 'You have already matched with this person' })
    const endedMatch = await client.query(`select m.id,m.ended_by,m.ended_at,
      exists(select 1 from match_apology_notes man where man.match_id=m.id and man.sender_id=$1
        and man.created_at>m.ended_at and ((m.ended_by=$1 and man.message_type='apology')
          or (m.ended_by<>$1 and man.message_type='contact'))) as "secondChanceAvailable"
      from matches m where m.status='unmatched' and
      ((m.user_one_id=$1 and m.user_two_id=$2) or (m.user_one_id=$2 and m.user_two_id=$1)) limit 1`, [sub,recipientId])
    if (endedMatch.rows[0] && !endedMatch.rows[0].secondChanceAvailable) {
      throw createError({ statusCode: 409, statusMessage: endedMatch.rows[0].ended_by === sub
        ? 'Send a private note before asking for a second chance'
        : 'Send a private message before re-offering interest' })
    }
    const existingInterest = await client.query(`select created_at from daily_interests
      where sender_id=$1 and recipient_id=$2 limit 1`, [sub,recipientId])
    if (existingInterest.rows[0] && (!endedMatch.rows[0] ||
      new Date(existingInterest.rows[0].created_at) > new Date(endedMatch.rows[0].ended_at))) {
      throw createError({ statusCode: 409, statusMessage: 'You have already sent interest to this person' })
    }
    const allowance = await client.query(`select count(*)::int as count from daily_interests di join users u on u.id=di.sender_id
      where di.sender_id=$1 and di.sender_day=(now() at time zone coalesce(u.timezone,'UTC'))::date`, [sub])
    if ((allowance.rows[0]?.count || 0) >= 5) throw createError({ statusCode: 409, statusMessage: 'You have reached today’s limit of 5 interests' })
    if (endedMatch.rows[0]) {
      await client.query(`delete from daily_interests where
        ((sender_id=$1 and recipient_id=$2) or (sender_id=$2 and recipient_id=$1))
        and created_at<=$3`, [sub,recipientId,endedMatch.rows[0].ended_at])
    }
    const inserted = await client.query(`insert into daily_interests(sender_id,recipient_id,sender_day)
      select $1,$2,(now() at time zone coalesce(timezone,'UTC'))::date from users where id=$1
      returning sender_day::text as date`, [sub,recipientId])
    await client.query(`insert into notifications(recipient_id,actor_id,kind)
      values($1,$2,'interest_received')`, [recipientId,sub])
    const reverse = await client.query('select 1 from daily_interests where sender_id=$1 and recipient_id=$2 limit 1', [recipientId,sub])
    let matched = false
    if (reverse.rows[0]) {
      const [one,two] = [sub,recipientId].sort()
      const created = await client.query(`insert into matches(user_one_id,user_two_id) values($1,$2)
        on conflict(user_one_id,user_two_id) do update set status='active',matched_at=now(),
          ended_by=null,ended_reason=null,ended_at=null returning id`, [one,two])
      if (endedMatch.rows[0]) {
        await client.query('delete from date_proposals where match_id=$1', [created.rows[0].id])
      }
      await client.query(`insert into notifications(recipient_id,actor_id,match_id,kind) values
        ($1,$2,$3,'new_match'),($2,$1,$3,'new_match')`, [sub,recipientId,created.rows[0].id])
      matched = true
    }
    await client.query('commit')
    return { interest: { profileSlug: slug, profileName: target.rows[0].display_name, date: inserted.rows[0].date }, matched }
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23514') throw createError({ statusCode: 409, statusMessage: 'One of you has reached their active match limit' })
    if ((error as { code?: string; constraint?: string }).code === '23505') {
      const constraint = (error as { constraint?: string }).constraint
      throw createError({ statusCode: 409, statusMessage: constraint === 'daily_interests_sender_recipient_unique'
        ? 'You have already sent interest to this person' : 'You have reached today’s limit of 5 interests' })
    }
    throw error
  } finally { client.release() }
})
