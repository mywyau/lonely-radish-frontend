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
    const target = await client.query(`select p.user_id,p.display_name from profiles p join users u on u.id=p.user_id
      where p.slug=$1 and p.user_id<>$2 and p.visibility='active' and u.account_status='active' for update`, [slug,sub])
    if (!target.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
    const recipientId = target.rows[0].user_id
    const inserted = await client.query(`insert into daily_interests(sender_id,recipient_id,sender_day)
      select $1,$2,(now() at time zone coalesce(timezone,'UTC'))::date from users where id=$1
      returning sender_day as date`, [sub,recipientId])
    const reverse = await client.query('select 1 from daily_interests where sender_id=$1 and recipient_id=$2 limit 1', [recipientId,sub])
    let matched = false
    if (reverse.rows[0]) {
      const [one,two] = [sub,recipientId].sort()
      await client.query(`insert into matches(user_one_id,user_two_id) values($1,$2)
        on conflict(user_one_id,user_two_id) do update set status='active'`, [one,two])
      matched = true
    }
    await client.query('commit')
    return { interest: { profileSlug: slug, profileName: target.rows[0].display_name, date: inserted.rows[0].date }, matched }
  } catch (error) {
    await client.query('rollback')
    if ((error as { code?: string }).code === '23505') throw createError({ statusCode: 409, statusMessage: 'You have already shown interest today' })
    throw error
  } finally { client.release() }
})
